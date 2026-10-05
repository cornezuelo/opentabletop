import type { Command, MapChange } from '../commands/command'
import { HexEditBatch } from '../commands/hexes'
import { ReplaceLabelCommand } from '../commands/paths'
import { DEFAULT_LABEL_STYLE } from '../model/defaults'
import { History } from '../commands/history'
import { createMap } from '../model/defaults'
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
  PathKind,
  PrintSettings,
  TerrainType,
} from '../model/types'

export type ToolId = 'select' | 'terrain' | 'path' | 'icon' | 'text'
export type TerrainMode = 'brush' | 'fill' | 'erase'

export const MAX_BRUSH_RADIUS = 5

export interface PathDraft {
  hexes: HexKey[]
  offsets: ([number, number] | null)[]
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
  meta = $state<MapMeta>({ ...this.map.meta })
  terrains = $state<TerrainType[]>([...this.map.terrains])
  layers = $state<Record<LayerId, LayerState>>(structuredClone(this.map.layers))
  canUndo = $state(false)
  canRedo = $state(false)

  tool = $state<ToolId>('terrain')
  /** What the side panel shows: the active tool and hex, or map settings and preferences. */
  panelView = $state<'tool' | 'settings' | 'export' | 'library'>('tool')
  terrainMode = $state<TerrainMode>('brush')
  terrainId = $state('steppe')
  brushRadius = $state(0)
  selected = $state<HexKey | null>(null)
  pathKind = $state<PathKind>('road')
  iconId = $state('game:village')
  /** Style applied to newly stamped icons. */
  iconStyle = $state<IconStyle>({})
  /** New paths are drawn with straight segments instead of curves. */
  pathStraight = $state(false)
  /** Path being drawn (hexes plus per-hex offsets), or null when not drawing. */
  pathDraft = $state<PathDraft | null>(null)
  selectedLabel = $state<string | null>(null)
  /** Bumped to ask the label panel to focus and select the text field (new label). */
  focusLabelText = $state(0)
  /** Style for new labels: the last one used. */
  labelStyle = $state<LabelStyle>({ ...DEFAULT_LABEL_STYLE })
  /** Labels being edited live (text typing, slider drags): original kept for one undo step. */
  private labelEdits = new Map<string, MapLabel>()

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

  /** Layer visibility/lock: saved with the map but not part of undo history. */
  setLayer(id: LayerId, patch: Partial<LayerState>): void {
    this.map.layers[id] = { ...this.map.layers[id], ...patch }
    this.notify({ kind: 'layers' })
  }

  /** True if the layer is locked; tools check this before editing. */
  isLocked(id: LayerId): boolean {
    return this.map.layers[id].locked
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
    this.labelEdits.clear()
    this.pathDraft = null
    if (!map.terrains.some((t) => t.id === this.terrainId))
      this.terrainId = map.terrains[0]?.id ?? ''
    this.notify({ kind: 'all' })
  }

  private touch(): void {
    this.map.meta.modified = new Date().toISOString()
    this.canUndo = this.history.canUndo
    this.canRedo = this.history.canRedo
    this.revision++
  }

  private syncSnapshots(change: MapChange): void {
    if (change.kind === 'grid' || change.kind === 'all') {
      this.grid = { ...this.map.grid }
      this.print = structuredClone(this.map.print)
    }
    if (change.kind === 'meta' || change.kind === 'all') this.meta = { ...this.map.meta }
    if (change.kind === 'layers' || change.kind === 'all')
      this.layers = structuredClone(this.map.layers)
    if (change.kind === 'terrains' || change.kind === 'all') this.terrains = [...this.map.terrains]
  }
}

export const editor = new Editor()
