import { openMapFile, saveMap } from './io/actions.svelte'
import { isTyping } from './render/MapRenderer'
import { editor, MAX_BRUSH_RADIUS } from './store/editor.svelte'
import { cancelPath, deleteSelectedLabel, finishPath, popPathPoint } from './tools/tools'
import { view } from './store/view'

/** Global keyboard shortcuts. Returns a cleanup function. */
export function bindShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    if (isTyping(e)) return
    const ctrl = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    if (ctrl) {
      if (key === 'z' && e.shiftKey) editor.redo()
      else if (key === 'z') editor.undo()
      else if (key === 'y') editor.redo()
      else if (key === 's') saveMap()
      else if (key === 'o') openMapFile()
      else return
      e.preventDefault()
      return
    }
    if (e.altKey) return

    if (editor.pathDraft) {
      const handled: Record<string, () => void> = {
        enter: finishPath,
        escape: cancelPath,
        backspace: popPathPoint,
      }
      if (handled[key]) {
        handled[key]()
        e.preventDefault()
        return
      }
    }

    if (
      editor.tool === 'text' &&
      editor.selectedLabel &&
      (key === 'delete' || key === 'backspace')
    ) {
      deleteSelectedLabel()
      e.preventDefault()
      return
    }

    switch (key) {
      case 'v':
        editor.tool = 'select'
        break
      case 'b':
        editor.tool = 'terrain'
        editor.terrainMode = 'brush'
        break
      case 'g':
        editor.tool = 'terrain'
        editor.terrainMode = 'fill'
        break
      case 'r':
        editor.tool = 'path'
        break
      case 'i':
        editor.tool = 'icon'
        break
      case 't':
        editor.tool = 'text'
        break
      case 'e':
        editor.tool = 'terrain'
        editor.terrainMode = 'erase'
        break
      case '[':
        editor.brushRadius = Math.max(0, editor.brushRadius - 1)
        break
      case ']':
        editor.brushRadius = Math.min(MAX_BRUSH_RADIUS, editor.brushRadius + 1)
        break
      case 'f':
        view.fit()
        break
      default:
        return
    }
    if ('vbgerit'.includes(key)) editor.panelView = 'tool'
    e.preventDefault()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
