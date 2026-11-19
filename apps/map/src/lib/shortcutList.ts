import { UNDO_KEYS, type Shortcut, type ShortcutGroup } from '@open-tabletop/ui-kit'
import { t } from './i18n/index.svelte'
import type { TerrainMode, ToolId } from './store/editor.svelte'

/**
 * Map's keyboard shortcuts, written once: the keys that pick a tool (read by `bindShortcuts`),
 * the keys of the bar's buttons (their tooltips), each tool's own keys (under its panel) and
 * all of them in the **?** dialog.
 */

/** The key that picks each tool (and the terrain's way of painting). */
export const TOOL_KEYS: Record<string, { tool: ToolId; terrainMode?: TerrainMode }> = {
  v: { tool: 'select' },
  b: { tool: 'terrain', terrainMode: 'brush' },
  g: { tool: 'terrain', terrainMode: 'fill' },
  e: { tool: 'terrain', terrainMode: 'erase' },
  n: { tool: 'region' },
  l: { tool: 'faction' },
  r: { tool: 'path' },
  w: { tool: 'wall' },
  c: { tool: 'connection' },
  i: { tool: 'icon' },
  t: { tool: 'text' },
  k: { tool: 'token' },
}

/** The keys that pick a tool, for its button's tooltip. */
export function toolKeys(tool: ToolId, terrainMode?: TerrainMode): string[] {
  return Object.entries(TOOL_KEYS)
    .filter(
      ([, to]) =>
        to.tool === tool && (!terrainMode || !to.terrainMode || to.terrainMode === terrainMode),
    )
    .slice(0, 1)
    .map(([key]) => key.toUpperCase())
}

/** The keys of the bar's and the map's buttons. */
export const ACTION_KEYS = {
  ...UNDO_KEYS,
  save: ['Ctrl+S'],
  open: ['Ctrl+O'],
  fit: ['F'],
  oracle: ['O'],
  mode: ['P'],
  /** A line being drawn (roads and rivers): its buttons in the panel. */
  finish: ['Enter'],
  undoPoint: ['Backspace'],
  cancel: ['Esc'],
  /** Let go of what's selected. */
  deselect: ['Esc'],
}

const terrain = (): Shortcut[] => [
  { keys: ['[', ']'], does: t('shortcuts.brushSize') },
  { keys: ['Shift+Drag'], does: t('shortcuts.rectangle') },
  { keys: ['Ctrl+Click'], does: t('shortcuts.pick') },
  { keys: ['Right click'], does: t('shortcuts.erase') },
]

const drawing = (): Shortcut[] => [
  { keys: ['Arrows'], does: t('shortcuts.corridor') },
  { keys: ['Shift+Arrows'], does: t('shortcuts.move') },
  { keys: ['R'], does: t('shortcuts.room') },
  { keys: ['D'], does: t('shortcuts.door') },
  { keys: ['Esc'], does: t('shortcuts.letGo') },
]

const lines = (): Shortcut[] => [
  { keys: [...ACTION_KEYS.finish, 'Right click'], does: t('shortcuts.finish') },
  { keys: ACTION_KEYS.undoPoint, does: t('shortcuts.undoPoint') },
  { keys: ACTION_KEYS.cancel, does: t('shortcuts.cancel') },
  { keys: ['Shift+Click'], does: t('shortcuts.offCentre') },
  { keys: ['Ctrl+Shift+Click'], does: t('shortcuts.free') },
]

/** Icons, labels, tokens and connections: what's selected is removed or let go. */
const selected = (letGo = true): Shortcut[] => [
  { keys: ['Delete', 'Backspace'], does: t('shortcuts.remove') },
  { keys: ['Right click'], does: t('shortcuts.removeHere') },
  ...(letGo ? [{ keys: ACTION_KEYS.deselect, does: t('shortcuts.deselect') }] : []),
]

const play = (): Shortcut[] => [{ keys: ['Arrows', 'WASD'], does: t('shortcuts.walk') }]

/**
 * A tool's own keys, under its panel (the keys that pick tools are in the **?** dialog). A
 * tool with one list shows it untitled; Terrain's two are named.
 */
export function toolShortcuts(tool: ToolId): ShortcutGroup[] {
  const one = (shortcuts: Shortcut[]): ShortcutGroup[] => [{ title: tool, shortcuts }]
  switch (tool) {
    case 'terrain':
      return [
        { title: t('shortcuts.painting'), shortcuts: terrain() },
        { title: t('shortcuts.keyboard'), shortcuts: drawing() },
      ]
    case 'region':
      return one([
        { keys: ['Shift+Drag'], does: t('shortcuts.rectangle') },
        { keys: ['Ctrl+Click'], does: t('shortcuts.pick') },
        { keys: ['Right click'], does: t('shortcuts.removeHere') },
      ])
    case 'path':
      return one(lines())
    case 'wall':
      return one([{ keys: ['Right click'], does: t('shortcuts.removeHere') }])
    case 'text':
      return one(selected(false))
    case 'icon':
    case 'token':
    case 'connection':
      return one(selected())
    case 'play':
      return one(play())
    default:
      return []
  }
}

/** Every shortcut of Map, by what it's for, for the **?** dialog. */
export function mapShortcuts(): ShortcutGroup[] {
  const tool = (id: ToolId) => t(`tools.${id}` as 'tools.select')
  const mode = (id: TerrainMode) =>
    t('shortcuts.toolMode', { tool: tool('terrain'), mode: t(`terrainMode.${id}`) })
  return [
    {
      title: t('shortcuts.tools'),
      shortcuts: Object.entries(TOOL_KEYS).map(([key, to]) => ({
        keys: [key.toUpperCase()],
        does: to.terrainMode ? mode(to.terrainMode) : tool(to.tool),
      })),
    },
    {
      title: t('shortcuts.view'),
      shortcuts: [
        { keys: ACTION_KEYS.mode, does: t('shortcuts.mode') },
        { keys: ['Space+Drag', 'Middle button+Drag'], does: t('shortcuts.pan') },
        { keys: ['Wheel'], does: t('shortcuts.zoom') },
        { keys: ACTION_KEYS.fit, does: t('actions.fit') },
        { keys: ACTION_KEYS.oracle, does: t('actions.oracle') },
      ],
    },
    {
      title: t('shortcuts.editing'),
      shortcuts: [
        { keys: ACTION_KEYS.undo, does: t('actions.undo') },
        { keys: ACTION_KEYS.redo, does: t('actions.redo') },
        { keys: ACTION_KEYS.save, does: t('actions.save') },
        { keys: ACTION_KEYS.open, does: t('shortcuts.open') },
      ],
    },
    { title: t('shortcuts.terrain'), shortcuts: terrain() },
    { title: t('shortcuts.drawing'), shortcuts: drawing() },
    { title: t('tools.path'), shortcuts: lines() },
    { title: t('shortcuts.selected'), shortcuts: selected() },
    { title: t('shortcuts.play'), shortcuts: play() },
  ]
}
