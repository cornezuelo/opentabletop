import type { Command, MapChange } from '../commands/command'
import { HexEditBatch } from '../commands/hexes'
import { ReplaceLabelCommand } from '../commands/paths'
import type { DiscoveredHex } from '@open-tabletop/session'
import {
  createCampaign,
  factionsOn,
  splitFactions,
  type Campaign,
  type FactionsOnMap,
} from '@open-tabletop/campaign'
import {
  createMap,
  DEFAULT_LABEL_STYLE,
  DEFAULT_TERRAINS,
  type GridSettings,
  type HexData,
  type HexKey,
  type HexMap,
  type IconStyle,
  type LabelStyle,
  type LayerId,
  type LayerState,
  type MapLabel,
  type MapMeta,
  type MapRegion,
  type MapToken,
  newId,
  type PathKind,
  playChanges,
  type PrintSettings,
  type TerrainType,
  type TokenKind,
} from '@open-tabletop/map'
import { History } from '../commands/history'
import { ReplaceTokenCommand } from '../commands/tokens'

export type ToolId = 'select' | 'terrain' | 'region' | 'path' | 'icon' | 'text' | 'token' | 'play'
export type TerrainMode = 'brush' | 'fill' | 'erase'
/** What the side panel shows besides the active tool's view. */
export type PanelView = 'tool' | 'settings' | 'export' | 'library' | 'oracle' | 'world' | 'layers'

export const MAX_BRUSH_RADIUS = 5

export interface PathDraft {
  hexes: HexKey[]
  offsets: ([number, number] | null)[]
  /** Which hexes the user placed (drawn vertices) vs. filled in between. */
  nodes: boolean[]
  /** Continuing an existing path from one of its endpoints. */
  extend?: { pathId: string; atStart: boolean }
}

type Listener = (change: MapChange) => void

/** Changes to what the campaign keeps (the world clock, the Oracle), not to the map. */
export const isCampaignChange = (change: MapChange): boolean =>
  change.kind === 'world' || change.kind === 'oracle'

/**
 * Central editor state. The map itself is a plain object (Pixi renders it, Svelte
 * doesn't need deep reactivity over thousands of hexes); the parts the UI shows are
 * mirrored into reactive snapshots on every change.
 */
class Editor {
  map: HexMap = createMap()
  /**
   * The open map's campaign (`map.meta.campaign`): the world clock, its weather, the
   * factions' sheets and the Oracle, shared by the campaign's maps. A plain object too.
   */
  campaign: Campaign = createCampaign(this.map.meta.campaign)
  private history = new History()
  private listeners = new Set<Listener>()

  /** Bumped on every map change; read it to make UI depend on map contents. */
  revision = $state(0)
  grid = $state<GridSettings>({ ...this.map.grid })
  print = $state<PrintSettings>(structuredClone(this.map.print))
  scale = $state<HexMap['scale']>({ ...this.map.scale })
  meta = $state<MapMeta>({ ...this.map.meta })
  terrains = $state<TerrainType[]>([...this.map.terrains])
  layers = $state<Record<LayerId, LayerState>>(structuredClone(this.map.layers))
  play = $state.raw<HexMap['play']>(undefined)
  world = $state.raw<Campaign['world']>(undefined)
  /** The campaign's factions as this map sees them (with the land each holds on it). */
  factions = $state.raw<FactionsOnMap | undefined>(undefined)
  tokens = $state.raw<MapToken[]>([])
  regions = $state.raw<MapRegion[]>([])
  captions = $state<HexMap['captions']>(structuredClone(this.map.captions))
  regionStyle = $state<HexMap['regionStyle']>({ ...this.map.regionStyle })
  /** Region the region tool paints. */
  regionId = $state<string | null>(null)
  /** The faction whose land a click on the map paints (World panel, Paint its land), if any. */
  factionBrush = $state<string | null>(null)
  canUndo = $state(false)
  canRedo = $state(false)

  #tool = $state<ToolId>('terrain')
  /**
   * The active tool. Changing it drops what the previous tool had selected (hex, icon,
   * label, token), so no outline or panel is left for something you can't edit now.
   * Play selects the party token; the token tool keeps the selected token (the same
   * kind of selection).
   */
  get tool(): ToolId {
    return this.#tool
  }
  set tool(tool: ToolId) {
    if (tool === this.#tool) return
    const token = tool === 'token' ? this.selectedToken : null
    this.#tool = tool
    this.selected = null
    this.selectedIcon = null
    this.selectedLabel = null
    this.selectedToken =
      tool === 'play' ? (this.map.tokens.find((t) => t.kind === 'party')?.id ?? null) : token
  }
  /** What the side panel shows: the active tool and hex, or map settings and preferences. */
  panelView = $state<PanelView>('tool')
  /**
   * The help column (the manual, or a field's explanation) is open beside the side panel,
   * as in every app, so a field and its help are seen together.
   */
  helpOpen = $state(false)
  /** The side panel is folded away (more room for the map, e.g. on a phone). */
  panelHidden = $state(false)
  /** The tools bar on the left is folded away (its keyboard shortcuts still work). */
  toolsHidden = $state(false)
  terrainMode = $state<TerrainMode>('brush')
  terrainId = $state('steppe')
  brushRadius = $state(0)
  selected = $state<HexKey | null>(null)
  /** Hexes with this tag are highlighted on the map (a view setting, not saved). */
  highlightTag = $state('')
  /** While highlighting, the other hexes are dimmed. */
  highlightDim = $state(false)
  pathKind = $state<PathKind>('road')
  iconId = $state('game:village')
  /** Hex whose icon the icon tool is editing (palette and style apply to it live). */
  selectedIcon = $state<HexKey | null>(null)
  /** Style applied to newly stamped icons. */
  iconStyle = $state<IconStyle>({})
  /** New paths are drawn with straight segments instead of curves. */
  pathStraight = $state(false)
  /** New paths are loops (the last point joins the first). */
  pathClosed = $state(false)
  /** Path being drawn (hexes plus per-hex offsets), or null when not drawing. */
  pathDraft = $state<PathDraft | null>(null)
  selectedLabel = $state<string | null>(null)
  /** Bumped to ask the label panel to focus and select the text field (new label). */
  focusLabelText = $state(0)
  /** Style for new labels: the last one used. */
  labelStyle = $state<LabelStyle>({ ...DEFAULT_LABEL_STYLE })
  /** Labels being edited live (text typing, slider drags): original kept for one undo step. */
  private labelEdits = new Map<string, MapLabel>()

  /** Token selected with the token tool (its panel edits it). */
  selectedToken = $state<string | null>(null)
  /** What a click on an empty hex places with the token tool. */
  tokenTemplate = $state<{ kind: TokenKind; iconId: string; color?: string }>({
    kind: 'pc',
    iconId: 'game:swordman',
  })

  /** Path vertex under the pointer (path tool), for highlighting and the grab cursor. */
  hoveredHandle = $state<{ pathId: string; index: number } | null>(null)

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  execute(command: Command): void {
    this.notify(this.history.execute(command, this.map))
  }

  /** Records a command whose effects were already applied and announced. */
  record(command: Command): void {
    this.history.record(command)
    this.touch()
  }

  /** Announces a change applied outside a command (live stroke preview). */
  notify(change: MapChange): void {
    this.syncSnapshots(change)
    for (const listener of this.listeners) listener(change)
    this.touch(change)
  }

  getLabel(id: string): MapLabel | undefined {
    return this.map.labels.find((l) => l.id === id)
  }

  /** Applies a label change immediately without recording it (call commitLabel later). */
  previewLabel(id: string, update: (label: MapLabel) => MapLabel): void {
    const label = this.getLabel(id)
    if (!label) return
    if (!this.labelEdits.has(id)) this.labelEdits.set(id, structuredClone(label))
    Object.assign(label, update(structuredClone(label)))
    this.notify({ kind: 'labels' })
  }

  /** Records pending live edits of a label as a single undoable step. */
  commitLabel(id: string): void {
    const before = this.labelEdits.get(id)
    const label = this.getLabel(id)
    this.labelEdits.delete(id)
    if (!before || !label) return
    const after = structuredClone(label)
    Object.assign(label, before)
    if (JSON.stringify(before) === JSON.stringify(after)) return this.notify({ kind: 'labels' })
    this.execute(new ReplaceLabelCommand(before, after))
  }

  /** One-shot label change (selects, toggles…) as an undoable step. */
  updateLabel(id: string, update: (label: MapLabel) => MapLabel): void {
    this.commitLabel(id)
    const label = this.getLabel(id)
    if (label) this.execute(new ReplaceLabelCommand(label, update(structuredClone(label))))
  }

  getToken(id: string): MapToken | undefined {
    return this.map.tokens.find((t) => t.id === id)
  }

  /** One token change (rename, restyle, move…) as an undoable step. */
  updateToken(id: string, update: (token: MapToken) => MapToken): void {
    const token = this.getToken(id)
    if (!token) return
    const after = update(structuredClone(token))
    if (JSON.stringify(after) === JSON.stringify(token)) return
    this.execute(new ReplaceTokenCommand(structuredClone(token), after))
  }

  /** The campaign's Oracle (rolls, decks): saved with the campaign, outside the undo history. */
  setOracle(oracle: Campaign['oracle']): void {
    this.campaign.oracle = oracle
    this.notify({ kind: 'oracle' })
  }

  /**
   * Writes what a trip discovered (play, so outside the undo history): terrain only on
   * empty hexes, tags added, a name only where there was none, points of interest added.
   */
  applyDiscovery(found: Record<string, DiscoveredHex>): void {
    const keys: HexKey[] = []
    let terrains = false
    for (const [key, d] of Object.entries(found) as [HexKey, DiscoveredHex][]) {
      const hex = { ...this.map.hexes[key] }
      if (d.terrain && !hex.terrain) {
        if (!this.map.terrains.some((t) => t.id === d.terrain)) {
          // A terrain the palette lacks: the default one, or a plain new entry.
          const known = DEFAULT_TERRAINS.find((t) => t.id === d.terrain)
          this.map.terrains = [
            ...this.map.terrains,
            known ? { ...known } : { id: d.terrain, name: d.terrain, color: '#8a8a6a' },
          ]
          terrains = true
        }
        hex.terrain = d.terrain
      }
      if (d.tags?.length) hex.tags = [...new Set([...(hex.tags ?? []), ...d.tags])]
      if (d.name && !hex.name) hex.name = d.name
      if (d.poi) hex.pois = [...(hex.pois ?? []), { id: newId(), name: d.poi }]
      this.map.hexes[key] = hex
      keys.push(key)
    }
    if (terrains) this.notify({ kind: 'terrains' })
    if (keys.length) this.notify({ kind: 'hexes', keys })
  }

  /** The world clock: saved with the campaign, outside the undo history (like play). */
  setWorld(world: Campaign['world']): void {
    this.campaign.world = world
    this.notify({ kind: 'world' })
  }

  /** The world clock's weather: saved with the campaign, outside the undo history. */
  setWorldWeather(weather: Campaign['worldWeather']): void {
    this.campaign.worldWeather = weather
    this.notify({ kind: 'world' })
  }

  /** The campaign's factions as this map sees them (their sheets, and their land on it). */
  get factionsOnMap(): FactionsOnMap | undefined {
    return factionsOn(this.campaign, this.map)
  }

  /**
   * The factions: their sheets and turns saved with the campaign, their land with the map,
   * outside the undo history (like the world clock). `undefined` takes them away.
   */
  setFactions(factions: FactionsOnMap | undefined): void {
    const split = splitFactions(factions)
    this.campaign.factions = split.factions
    this.map.territories = split.territories
    this.notify({ kind: 'factions' })
  }

  /**
   * Tokens changed from outside the map (their roster characters, changed in the Characters
   * app): saved with the map, outside the undo history.
   */
  setTokensQuietly(tokens: MapToken[]): void {
    this.map.tokens = tokens
    this.notify({ kind: 'tokens' })
  }

  /** Play state changes: saved with the map but not part of the editor's undo history. */
  setPlay(play: HexMap['play']): void {
    this.map.play = play
    this.notify({ kind: 'play' })
  }

  /** Layer visibility/lock: saved with the map but not part of undo history. */
  setLayer(id: LayerId, patch: Partial<LayerState>): void {
    this.map.layers[id] = { ...this.map.layers[id], ...patch }
    this.notify({ kind: 'layers' })
  }

  /** True if the layer is locked; tools check this before editing. */
  isLocked(id: LayerId): boolean {
    return this.map.layers[id].locked
  }

  /** Hexes being edited live (slider drags): one batch per hex until committed. */
  private hexPreviews = new Map<HexKey, HexEditBatch>()

  /** Applies a hex change immediately without recording it (call commitHex later). */
  previewHex(key: HexKey, update: (hex: HexData) => HexData): void {
    let batch = this.hexPreviews.get(key)
    if (!batch) {
      batch = new HexEditBatch(this.map)
      this.hexPreviews.set(key, batch)
    }
    if (batch.edit(key, update)) this.notify({ kind: 'hexes', keys: [key] })
  }

  /** Records pending live edits of a hex as a single undoable step. */
  commitHex(key: HexKey): void {
    const command = this.hexPreviews.get(key)?.finish()
    this.hexPreviews.delete(key)
    if (command) this.record(command)
  }

  /** Edits one hex as a single undoable step. No-op if nothing changes. */
  editHex(key: HexKey, update: (hex: HexData) => HexData): void {
    const batch = new HexEditBatch(this.map)
    if (!batch.edit(key, update)) return
    const command = batch.finish()
    if (!command) return
    this.notify({ kind: 'hexes', keys: [key] })
    this.record(command)
  }

  undo(): void {
    const change = this.history.undo(this.map)
    if (change) this.notify(change)
  }

  redo(): void {
    const change = this.history.redo(this.map)
    if (change) this.notify(change)
  }

  /**
   * The open map as another window or app saved it. If only play changed (the world clock,
   * factions, the Oracle, a trip, tokens, layers: `playChanges`), those parts are taken and
   * the undo history stays; otherwise the whole map is loaded and the history starts again.
   * Returns whether the history was kept.
   */
  takeFromElsewhere(next: HexMap): boolean {
    const parts = playChanges(this.map, next)
    if (!parts) {
      const selected = this.selected
      this.load(next)
      if (selected && next.hexes[selected]) this.selected = selected
      return false
    }
    for (const part of parts) (this.map as unknown as Record<string, unknown>)[part] = next[part]
    const kinds = new Set<MapChange['kind']>(
      parts.map((p) => (p === 'territories' ? 'factions' : p)),
    )
    for (const kind of kinds) this.notify({ kind } as MapChange)
    return true
  }

  /**
   * The open map's campaign as another window or app saved it (a world turn in the Campaign
   * app, another map of it played): all play, so taken whole, keeping the undo history.
   */
  takeCampaign(next: Campaign): void {
    if (next.id !== this.campaign.id) return
    this.campaign = next
    for (const kind of ['world', 'oracle', 'factions'] as const) this.notify({ kind })
  }

  /** Opens a map read with its campaign (`parseMapFile`, `openMap`). */
  open({ map, campaign }: { map: HexMap; campaign?: Campaign }): void {
    this.load(map, campaign)
  }

  /** Opens a map with its campaign (by default a new one of its own). */
  load(map: HexMap, campaign: Campaign = createCampaign(map.meta.campaign, map.meta.name)): void {
    this.map = map
    this.campaign = campaign
    this.history.clear()
    this.selected = null
    this.selectedLabel = null
    this.selectedIcon = null
    this.selectedToken = null
    this.labelEdits.clear()
    this.hexPreviews.clear()
    this.pathDraft = null
    this.factionBrush = null
    if (!map.terrains.some((t) => t.id === this.terrainId))
      this.terrainId = map.terrains[0]?.id ?? ''
    this.notify({ kind: 'all' })
  }

  /** Drops selections that no longer point at anything (e.g. after undo). */
  private pruneSelections(): void {
    if (this.selectedIcon && !this.map.hexes[this.selectedIcon]?.icon) this.selectedIcon = null
    if (this.selectedLabel && !this.getLabel(this.selectedLabel)) this.selectedLabel = null
    if (this.selectedToken && !this.getToken(this.selectedToken)) this.selectedToken = null
  }

  private touch(change?: MapChange): void {
    this.pruneSelections()
    const now = new Date().toISOString()
    // The world clock and the Oracle are the campaign's; factions are both (sheets and land).
    if (change && (isCampaignChange(change) || change.kind === 'factions'))
      this.campaign.modified = now
    if (!change || !isCampaignChange(change)) this.map.meta.modified = now
    this.canUndo = this.history.canUndo
    this.canRedo = this.history.canRedo
    this.revision++
  }

  private syncSnapshots(change: MapChange): void {
    if (change.kind === 'style' || change.kind === 'all') {
      this.grid = { ...this.map.grid }
      this.captions = structuredClone(this.map.captions)
    }
    if (change.kind === 'grid' || change.kind === 'all') {
      this.grid = { ...this.map.grid }
      this.print = structuredClone(this.map.print)
      this.scale = { ...this.map.scale }
    }
    if (change.kind === 'meta' || change.kind === 'all') this.meta = { ...this.map.meta }
    if (change.kind === 'world' || change.kind === 'all') this.world = this.campaign.world
    if (change.kind === 'factions' || change.kind === 'all') this.factions = this.factionsOnMap
    if (change.kind === 'play' || change.kind === 'all')
      this.play = this.map.play ? structuredClone(this.map.play) : undefined
    if (change.kind === 'layers' || change.kind === 'all')
      this.layers = structuredClone(this.map.layers)
    if (change.kind === 'terrains' || change.kind === 'all') this.terrains = [...this.map.terrains]
    if (change.kind === 'tokens' || change.kind === 'all') this.tokens = [...this.map.tokens]
    if (change.kind === 'regions' || change.kind === 'all') {
      this.regionStyle = { ...this.map.regionStyle }
      this.regions = [...this.map.regions]
      if (this.regionId && !this.map.regions.some((r) => r.id === this.regionId))
        this.regionId = this.map.regions[0]?.id ?? null
    }
  }
}

export const editor = new Editor()
