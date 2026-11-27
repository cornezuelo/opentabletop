import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { roster } from '@open-tabletop/character-ui'
import { emptyRoster, rosterToOtd } from '@open-tabletop/session'
import { validateBundle } from '@open-tabletop/schema'
import {
  deleteImage,
  getImage,
  IMAGE_FORMAT,
  putImage,
  withCarriedImages,
  type LibraryImage,
} from '@open-tabletop/storage'
import { applyCharacter, buildProblems } from '@open-tabletop/character-engine'
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

  it('a Grey Marches companion spreads two points among their skills as made', () => {
    const sheet = marches().sheet.def
    expect(sheet.build?.points).toBe(2)
    // Their skills as they start: Survival 1, Stealth 1, the others 0.
    expect(buildProblems(sheet, {})).toEqual([{ code: 'POINTS_LEFT', left: 2 }])
    expect(buildProblems(sheet, { survival: 3 })).toContainEqual({
      code: 'ABOVE_MAX',
      value: 'survival',
      max: 2,
    })
    // None below where it starts.
    expect(buildProblems(sheet, { survival: 2, pathfinding: 2, stealth: 0 })).toContainEqual({
      code: 'TOO_MANY_LOWER',
      lower: 0,
    })
    const built = { survival: 2, pathfinding: 1 }
    expect(buildProblems(sheet, built)).toEqual([])
    const made = entryOf(createCharacter(marches(), 'Brenna', false, built))!.character
    expect(made.values).toMatchObject({ survival: 2, pathfinding: 1, charisma: 0, stealth: 1 })
    // Its description in Spanish from the pack's overlay.
    expect(sheet.build?.description).toMatchObject({ es: expect.stringContaining('Compañía') })
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

  it('exports valid OTD, and imports it back with new ids where taken', async () => {
    const id = createCharacter(marches(), 'Kael')
    const file = rosterToOtd([{ ...entryOf(id)!, noteRef: 'People/Kael' }])
    expect(validateBundle(JSON.parse(JSON.stringify(file))).errors).toEqual([])
    expect(await importCharacters(JSON.stringify(file))).toEqual({ names: ['Kael'] })
    expect(entryOf('kael-2')).toMatchObject({ noteRef: 'People/Kael', character: { name: 'Kael' } })
    expect(await importCharacters('{')).toEqual({ error: 'broken' })
    expect(await importCharacters('{"otd":"0.2.0","characters":[]}')).toEqual({ names: [] })
  })

  it('carries a character’s portrait in its file, back into another browser’s library', async () => {
    const id = createCharacter(marches(), 'Mara')
    const face: LibraryImage = {
      id: 'mara-face',
      name: 'Mara',
      modified: '2026-11-20T00:00:00.000Z',
      format: IMAGE_FORMAT,
      data: 'data:image/webp;base64,UklGR',
      width: 512,
      height: 512,
      tags: [],
      use: 'portrait',
    }
    await putImage(face)
    const entry = entryOf(id)!
    const file = await withCarriedImages(
      rosterToOtd([{ ...entry, character: { ...entry.character, picture: 'mara-face' } }]),
    )
    expect(file.images).toEqual([expect.objectContaining({ id: 'mara-face', data: face.data })])
    expect(validateBundle(JSON.parse(JSON.stringify(file))).errors).toEqual([])
    // Another browser: the library hasn't got it until the file comes.
    await deleteImage('mara-face')
    await importCharacters(JSON.stringify(file))
    expect(entryOf('mara-2')!.character.picture).toBe('mara-face')
    expect(await getImage('mara-face')).toMatchObject({ name: 'Mara', data: face.data })
  })

  it('imports the company of the Grey Marches’ example map', async () => {
    const files = import.meta.glob('../../../../packs/grey-marches/maps/*.otd.json', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const map = Object.entries(files).find(([path]) => path.endsWith('/grey-marches.otd.json'))?.[1]
    expect(map).toBeDefined()
    const done = await importCharacters(map!)
    expect(done).toEqual({ names: expect.arrayContaining(['Kael', 'Mara']) })
  })
})
