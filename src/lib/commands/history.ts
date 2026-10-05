import type { HexMap } from '../model/types'
import type { Command, MapChange } from './command'

export class History {
  private undoStack: Command[] = []
  private redoStack: Command[] = []

  constructor(private limit = 500) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Applies a command and records it. */
  execute(command: Command, map: HexMap): MapChange {
    const change = command.apply(map)
    this.record(command)
    return change
  }

  /** Records a command whose effects are already applied (e.g. a live brush stroke). */
  record(command: Command): void {
    this.undoStack.push(command)
    if (this.undoStack.length > this.limit) this.undoStack.shift()
    this.redoStack = []
  }

  undo(map: HexMap): MapChange | null {
    const command = this.undoStack.pop()
    if (!command) return null
    this.redoStack.push(command)
    return command.revert(map)
  }

  redo(map: HexMap): MapChange | null {
    const command = this.redoStack.pop()
    if (!command) return null
    this.undoStack.push(command)
    return command.apply(map)
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
