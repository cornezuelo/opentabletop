import type { Command, MapChange } from '../commands/command'
import { HexEditBatch } from '../commands/hexes'
import { History } from '../commands/history'
import { createMap } from '../model/defaults'
import type {
  GridSettings,
  HexData,
  HexKey,
  HexMap,
  MapMeta,
  PrintSettings,
  TerrainType,
} from '../model/types'

export type ToolId = 'select' | 'terrain'
export type TerrainMode = 'brush' | 'fill' | 'erase'

export const MAX_BRUSH_RADIUS = 5

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
  canUndo = $state(false)
  canRedo = $state(false)

  tool = $state<ToolId>('terrain')
  terrainMode = $state<TerrainMode>('brush')
  terrainId = $state('steppe')
  brushRadius = $state(0)
  selected = $state<HexKey | null>(null)

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
    if (change.kind === 'terrains' || change.kind === 'all') this.terrains = [...this.map.terrains]
  }
}

export const editor = new Editor()
