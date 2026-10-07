import type { Command, MapChange } from '../commands/command'
import { HexEditBatch } from '../commands/hexes'
import { ReplaceLabelCommand } from '../commands/paths'
import type { DiscoveredHex } from '@open-tabletop/session'
import { DEFAULT_LABEL_STYLE, DEFAULT_TERRAINS } from '../model/defaults'
import { newId } from '../model/id'
import { History } from '../commands/history'
import { createMap } from '../model/defaults'
import { ReplaceTokenCommand } from '../commands/tokens'
import type {
  GridSettings,
  HexData,
  HexKey,
  HexMap,
  MapMeta,
  IconStyle,
  LabelStyle,
  MapLabel,
  LayerId,
  LayerState,
  MapRegion,
  MapToken,
  PathKind,
  PrintSettings,
  TerrainType,
  TokenKind,
} from '../model/types'

export type ToolId = 'select' | 'terrain' | 'region' | 'path' | 'icon' | 'text' | 'token' | 'play'
export type TerrainMode = 'brush' | 'fill' | 'erase'

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

/**
 * Central editor state. The map itself is a plain object (Pixi renders it, Svelte
 * doesn't need deep reactivity over thousands of hexes); the parts the UI shows are
 * mirrored into reactive snapshots on every change.
 */
class Editor {
  map: HexMap = createMap()
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
  play = $state<HexMap['play']>(undefined)
  tokens = $state.raw<MapToken[]>([])
  regions = $state.raw<MapRegion[]>([])
  captions = $state<HexMap['captions']>(structuredClone(this.map.captions))
  /** Region the region tool paints. */
  regionId = $state<string | null>(null)
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
  panelView = $state<'tool' | 'settings' | 'export' | 'library' | 'oracle' | 'help' | 'layers'>(
    'tool',
  )
  /** The side panel is folded away (more room for the map, e.g. on a phone). */
  panelHidden = $state(false)
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
    this.touch()
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

  /** The map's Oracle (rolls, decks): saved with the map, outside the undo history. */
  setOracle(oracle: HexMap['oracle']): void {
    this.map.oracle = oracle
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

  load(map: HexMap): void {
    this.map = map
    this.history.clear()
    this.selected = null
    this.selectedLabel = null
    this.selectedIcon = null
    this.selectedToken = null
    this.labelEdits.clear()
    this.hexPreviews.clear()
    this.pathDraft = null
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

  private touch(): void {
    this.pruneSelections()
    this.map.meta.modified = new Date().toISOString()
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
    if (change.kind === 'play' || change.kind === 'all')
      this.play = this.map.play ? structuredClone(this.map.play) : undefined
    if (change.kind === 'layers' || change.kind === 'all')
      this.layers = structuredClone(this.map.layers)
    if (change.kind === 'terrains' || change.kind === 'all') this.terrains = [...this.map.terrains]
    if (change.kind === 'tokens' || change.kind === 'all') this.tokens = [...this.map.tokens]
    if (change.kind === 'regions' || change.kind === 'all') {
      this.regions = [...this.map.regions]
      if (this.regionId && !this.map.regions.some((r) => r.id === this.regionId))
        this.regionId = this.map.regions[0]?.id ?? null
    }
  }
}

export const editor = new Editor()
