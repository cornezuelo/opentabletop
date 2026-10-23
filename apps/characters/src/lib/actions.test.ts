import { beforeEach, describe, expect, it } from 'vitest'
import { roster } from '@open-tabletop/character-ui'
import { emptyRoster, rosterToOtd } from '@open-tabletop/session'
import { validateBundle } from '@open-tabletop/schema'
import { applyCharacter } from '@open-tabletop/character-engine'
import {
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
  entryOf,
  importCharacters,
} from './actions'
import { systems } from './packs.svelte'

const marches = () => systems.list.find((s) => s.id === 'grey-marches')!

describe('the roster in the Characters app', () => {
  beforeEach(() => roster.set(emptyRoster()))

  it('lists the systems with a characters’ sheet', () => {
    expect(systems.list.map((s) => s.id)).toEqual(expect.arrayContaining(['core', 'grey-marches']))
    expect(systems.ofSheet(marches().sheet.id)?.id).toBe('grey-marches')
  })

  it('a Core character’s harm and Down hold by themselves, from health', () => {
    const core = systems.list.find((s) => s.id === 'core')!
    const made = entryOf(createCharacter(core, 'Ash'))!.character
    expect(made.values).toMatchObject({ health: 3, harm: 0 })
    const sheet = core.sheet.def
    const down = applyCharacter(sheet, made, {
      type: 'change',
      effects: { 'values.health': -3 },
    }).state
    expect(down.values.harm).toBe(3)
    expect(down.conditions).toHaveProperty('down')
    const up = applyCharacter(sheet, down, { type: 'change', effects: { 'values.health': 1 } })
    expect(up.state.conditions).not.toHaveProperty('down')
  })

  it('makes a character with its system’s sheet, duplicates and deletes it', () => {
    const id = createCharacter(marches(), 'Old Tóbin')
    expect(id).toBe('old-tobin')
    const made = entryOf(id)!.character
    expect(made.sheet).toBe(marches().sheet.id)
    // The sheet's starting values.
    expect(Object.keys(made.values)).toEqual(
      expect.arrayContaining(Object.keys(marches().sheet.def.values)),
    )
    expect(createCharacter(marches(), 'Old Tobin')).toBe('old-tobin-2')
    const copy = duplicateCharacter(id, 'Young Tobin')
    expect(entryOf(copy)!.character).toMatchObject({ name: 'Young Tobin', values: made.values })
    deleteCharacter(id)
    expect(entryOf(id)).toBeUndefined()
    // Kept for the next page load.
    expect(localStorage.getItem('opentabletop.characters')).toContain('young-tobin')
  })

  it('exports valid OTD, and imports it back with new ids where taken', () => {
    const id = createCharacter(marches(), 'Kael')
    const file = rosterToOtd([{ ...entryOf(id)!, noteRef: 'People/Kael' }])
    expect(validateBundle(JSON.parse(JSON.stringify(file))).errors).toEqual([])
    expect(importCharacters(JSON.stringify(file))).toEqual({ names: ['Kael'] })
    expect(entryOf('kael-2')).toMatchObject({ noteRef: 'People/Kael', character: { name: 'Kael' } })
    expect(importCharacters('{')).toEqual({ error: 'broken' })
    expect(importCharacters('{"otd":"0.2.0","characters":[]}')).toEqual({ names: [] })
  })

  it('imports the company of the Grey Marches’ example map', async () => {
    const files = import.meta.glob('../../../../packs/grey-marches/maps/*.otd.json', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const [map] = Object.values(files)
    expect(map).toBeDefined()
    const done = importCharacters(map)
    expect(done).toEqual({ names: expect.arrayContaining(['Kael', 'Mara']) })
  })
})
