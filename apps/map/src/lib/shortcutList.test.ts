import { describe, expect, it, vi } from 'vitest'
import { setLocale } from './i18n/index.svelte'
import { mapShortcuts, TOOL_KEYS, toolKeys, toolShortcuts } from './shortcutList'
import type { ToolId } from './store/editor.svelte'

describe("Map's shortcuts", () => {
  it('lists every key that picks a tool, once, under Tools', () => {
    const tools = mapShortcuts()[0].shortcuts.map((s) => s.keys[0])
    expect(tools).toEqual(Object.keys(TOOL_KEYS).map((key) => key.toUpperCase()))
  })

  it('gives each tool on the bar the key that picks it', () => {
    const onTheBar: ToolId[] = [
      'select',
      'terrain',
      'region',
      'faction',
      'path',
      'wall',
      'connection',
      'icon',
      'text',
      'token',
    ]
    for (const tool of onTheBar) expect(toolKeys(tool)).toHaveLength(1)
    expect(toolKeys('terrain')).toEqual(['B'])
    expect(toolKeys('terrain', 'fill')).toEqual(['G'])
    expect(toolKeys('play')).toEqual([])
  })

  it("shows a tool's own keys under its panel, keyboard drawing with Terrain", () => {
    const terrain = toolShortcuts('terrain')
    expect(terrain.map((group) => group.title)).toEqual(['Painting', 'Drawing with the keyboard'])
    expect(terrain[1].shortcuts.map((s) => s.keys[0])).toEqual([
      'Arrows',
      'Shift+Arrows',
      'R',
      'D',
      'Esc',
    ])
    expect(toolShortcuts('text')[0].shortcuts.some((s) => s.keys.includes('Esc'))).toBe(false)
    expect(toolShortcuts('select')).toEqual([])
  })

  it('writes what each one does in the UI language', () => {
    vi.stubGlobal('document', { documentElement: {} })
    setLocale('es')
    try {
      expect(mapShortcuts()[0].title).toBe('Herramientas')
      expect(toolShortcuts('play')[0].shortcuts[0].does).toMatch(/grupo/)
    } finally {
      setLocale('en')
      vi.unstubAllGlobals()
    }
  })

  it('never writes a shortcut with nothing to say', () => {
    for (const group of mapShortcuts()) {
      for (const shortcut of group.shortcuts) {
        expect(shortcut.keys.length).toBeGreaterThan(0)
        expect(shortcut.does).not.toMatch(/^shortcuts\.|^tools\.|^actions\./)
      }
    }
  })
})
