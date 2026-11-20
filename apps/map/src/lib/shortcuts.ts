import { walkByKey } from './play/play'
import { TOOL_KEYS } from './shortcutList'
import { drawByKey } from './tools/keyboardDraw'
import { openMapFile, saveMap } from './io/actions.svelte'
import { isTyping } from '@open-tabletop/ui-kit'
import { editor, MAX_BRUSH_RADIUS } from './store/editor.svelte'
import {
  cancelPath,
  deleteSelectedConnection,
  deleteSelectedIcon,
  deleteSelectedLabel,
  deleteSelectedToken,
  finishPath,
  popPathPoint,
} from './tools/tools'
import { view } from './store/view'

/** Global keyboard shortcuts (listed in `shortcutList`; **?** is ui-kit's). Returns a cleanup function. */
export function bindShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    // Save/open work even while typing: commit the field first (its change fires on blur).
    if (ctrl && !e.shiftKey && (key === 's' || key === 'o')) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      if (key === 's') void saveMap()
      else openMapFile()
      e.preventDefault()
      return
    }
    if (isTyping(e)) return

    if (ctrl) {
      if (key === 'z' && e.shiftKey) editor.redo()
      else if (key === 'z') editor.undo()
      else if (key === 'y') editor.redo()
      else if (key === 's') void saveMap()
      else if (key === 'o') openMapFile()
      else return
      e.preventDefault()
      return
    }
    if (e.altKey) return

    if (drawByKey(key, e.shiftKey) || walkByKey(key)) {
      e.preventDefault()
      return
    }

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

    if (editor.tool === 'icon' && editor.selectedIcon) {
      if (key === 'escape') {
        editor.selectedIcon = null
        e.preventDefault()
        return
      }
      if (key === 'delete' || key === 'backspace') {
        deleteSelectedIcon()
        e.preventDefault()
        return
      }
    }

    if (editor.tool === 'connection' && (editor.selectedConnection || editor.connectionStart)) {
      if (key === 'escape') {
        editor.selectedConnection = null
        editor.connectionStart = null
        e.preventDefault()
        return
      }
      if (editor.selectedConnection && (key === 'delete' || key === 'backspace')) {
        deleteSelectedConnection()
        e.preventDefault()
        return
      }
    }

    if ((editor.tool === 'token' || editor.tool === 'select') && editor.selectedToken) {
      if (key === 'escape') {
        editor.selectedToken = null
        e.preventDefault()
        return
      }
      if ((key === 'delete' || key === 'backspace') && editor.mode === 'edit') {
        deleteSelectedToken()
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

    // The tools that edit the map have no keys in Play (Select has): a slip can't turn a
    // click into a stroke.
    const to = TOOL_KEYS[key]
    if (to) {
      if (editor.mode === 'play' && to.tool !== 'select') return
      editor.tool = to.tool
      if (to.terrainMode) editor.terrainMode = to.terrainMode
      editor.panelView = 'tool'
      e.preventDefault()
      return
    }

    switch (key) {
      case 'p':
        editor.switchMode(editor.mode === 'play' ? 'edit' : 'play')
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
      case 'o':
        editor.panelView = editor.panelView === 'oracle' ? 'tool' : 'oracle'
        break
      default:
        return
    }
    e.preventDefault()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
