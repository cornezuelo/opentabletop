import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Characters app's Bestiary: a system's templates, shown as they are (edited in
 * Systems), and copies of one as roster characters, each with its own rolls.
 */
async function open() {
  vi.resetModules()
  const { roster } = await import('@open-tabletop/character-ui')
  const { library, systems } = await import('./packs.svelte')
  const bestiary = await import('./bestiary')
  return { roster, library, systems, ...bestiary }
}

const wolf = { bestiary: 'grey-marches/marches', id: 'grey-wolf', name: 'Grey wolf' }

describe('the bestiary in Characters', () => {
  beforeEach(() => localStorage.clear())

  it('lists the templates of a system, with their sheets', async () => {
    const { systems, templatesOf } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const wolf = templatesOf(marches, 'en').find((e) => e.id === 'grey-wolf')!
    expect(wolf.sheet).toBeDefined()
    expect(wolf.others).toContain('pack-leader')
    expect(wolf.def.values?.health).toBeDefined()
    expect(wolf.sheetId).toBe('grey-marches/foe')
    // A variant has the tags of the template it's like, for the filter by tag.
    const leader = templatesOf(marches, 'en').find((e) => e.id === 'pack-leader')!
    expect(leader.tags).toEqual(expect.arrayContaining(['beast', 'pack', 'leader']))
  })

  it('links a template to where it is edited: its system’s Bestiary tab in Systems', async () => {
    const { templateUrl } = await open()
    expect(templateUrl({ id: 'grey-marches' }, 'grey-wolf')).toMatch(
      /systems\/#\/system\/grey-marches\/bestiary\/grey-wolf$/,
    )
    expect(templateUrl({ id: 'grey-marches' })).toMatch(/#\/system\/grey-marches\/bestiary$/)
  })

  it('makes independent copies in the roster, numbered, keeping where they come from', async () => {
    const { roster, systems, makeCopies } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const ids = makeCopies(marches, wolf, 3)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    const made = roster.roster.characters.map((e) => e.character)
    expect(made.map((c) => c.name)).toEqual(['Grey wolf 1', 'Grey wolf 2', 'Grey wolf 3'])
    expect(made.every((c) => c.template?.id === 'grey-wolf')).toBe(true)
  })

  it('names copies by the template’s generator, and finds and deletes a template’s copies', async () => {
    const { roster, systems, makeCopies, copiesOf, deleteCopies } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const bandit = { bestiary: 'grey-marches/marches', id: 'bandit', name: 'Bandit' }
    const [hrolf] = makeCopies(marches, bandit, 1)
    const named = roster.roster.characters.find((e) => e.character.id === hrolf)!.character
    expect(named.name).not.toMatch(/^Bandit/)
    expect(named.template).toEqual({ id: 'bandit', from: 'grey-marches/marches' })
    makeCopies(marches, wolf, 2)
    expect(copiesOf(wolf)).toHaveLength(2)
    expect(copiesOf(bandit)).toHaveLength(1)
    expect(deleteCopies(wolf)).toBe(2)
    expect(roster.roster.characters.map((e) => e.character.id)).toEqual([hrolf])
  })

  it('finds a copy on a sheet of its own with its system, to edit it like any character', async () => {
    const { roster, systems, makeCopies } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const [id] = makeCopies(marches, wolf, 1)
    const copy = roster.roster.characters.find((e) => e.character.id === id)!.character
    expect(copy.sheet).not.toBe(marches.sheet.id)
    const found = systems.sheetOf(copy.sheet)!
    expect(found.system.id).toBe('grey-marches')
    expect(found.def.values.health).toBeDefined()
    expect(systems.ofSheet(marches.sheet.id)?.id).toBe('grey-marches')
  })

  it('offers a copy made here to the trips and tokens of its system, not to another', async () => {
    const { roster, systems, makeCopies } = await open()
    const { rosterCreatures } = await import('@open-tabletop/session')
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const generic = systems.list.find((s) => s.id !== 'grey-marches')!
    const [id] = makeCopies(marches, wolf, 1)
    const place = { app: 'travel', id: 't1', name: 'A trip' }
    expect(rosterCreatures(marches, roster.roster, place).map((e) => e.character.id)).toEqual([id])
    expect(rosterCreatures(generic, roster.roster, place)).toEqual([])
  })
})
