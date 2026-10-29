import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Characters app's Bestiary: a system's templates, copies of one as roster characters,
 * each with its own rolls, and changing a template only in a pack of the user's.
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

  it('adds a template only to a bestiary of the user’s', async () => {
    const { library, systems, ownBestiaries, addTemplate, templatesOf } = await open()
    const marches = () => systems.list.find((s) => s.id === 'grey-marches')!
    expect(ownBestiaries(marches())).toEqual([])
    library.editCopy('grey-marches')
    const [own] = ownBestiaries(marches())
    expect(own).toBe('grey-marches/marches')
    expect(addTemplate(marches(), own, 'Cave bear')).toBe('cave-bear')
    expect(addTemplate(marches(), own, 'Cave bear')).toBe('cave-bear-2')
    expect(templatesOf(marches(), 'en').find((e) => e.id === 'cave-bear')?.name).toBe('Cave bear')
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

  it('writes a template’s texts in the language being edited, the rest where it changed', async () => {
    const { library, systems, templatesOf, saveTemplate } = await open()
    const entry = () =>
      templatesOf(
        systems.list.find((s) => s.id === 'grey-marches')!,
        'es',
      ).find((e) => e.id === 'grey-wolf')!
    library.editCopy('grey-marches')
    const root = library.rootOf('grey-marches')!
    const before = entry().def
    // Translated texts come folded in as { en, es }.
    expect(typeof before.name).toBe('object')
    saveTemplate(entry().bestiary, 'grey-wolf', { ...before, name: 'Lobo flaco' }, before, 'es')
    expect(library.readFile(root, 'locales/es/bestiary.yaml')).toContain('name: Lobo flaco')
    saveTemplate(
      entry().bestiary,
      'grey-wolf',
      { ...entry().def, tags: ['beast'] },
      entry().def,
      'es',
    )
    const base = library.readFile(root, 'bestiary.yaml')!
    expect(base).toContain('name: Grey wolf')
    expect(base).not.toContain('Lobo')
    expect(entry().def.tags).toEqual(['beast'])
    expect(entry().def.name).toEqual({ en: 'Grey wolf', es: 'Lobo flaco' })
  })

  it('changes a template only in a pack of the user, after a copy of the bundled one', async () => {
    const { library, systems, templatesOf, saveTemplate, canEdit } = await open()
    const marches = () => systems.list.find((s) => s.id === 'grey-marches')!
    const entry = () => templatesOf(marches(), 'en').find((e) => e.id === 'grey-wolf')!
    const { bestiary, def } = entry()
    expect(canEdit(bestiary)).toBe(false)
    expect(saveTemplate(bestiary, 'grey-wolf', { ...def, tags: ['changed'] })).toBe(false)
    library.editCopy(bestiary.split('/')[0])
    expect(canEdit(bestiary)).toBe(true)
    expect(saveTemplate(bestiary, 'grey-wolf', { ...def, tags: ['changed'] })).toBe(true)
    expect(entry().def.tags).toEqual(['changed'])
  })
})
