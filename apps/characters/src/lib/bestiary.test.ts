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

describe('the bestiary in Characters', () => {
  beforeEach(() => localStorage.clear())

  it('lists the templates of a system, with their sheets', async () => {
    const { systems, templatesOf } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const wolf = templatesOf(marches, 'en').find((e) => e.id === 'grey-wolf')!
    expect(wolf.sheet).toBeDefined()
    expect(wolf.others).toContain('pack-leader')
    expect(wolf.def.values?.health).toBeDefined()
  })

  it('makes independent copies in the roster, numbered, keeping where they come from', async () => {
    const { roster, systems, makeCopies } = await open()
    const marches = systems.list.find((s) => s.id === 'grey-marches')!
    const ids = makeCopies(marches, 'grey-wolf', 'Grey wolf', 3)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    const made = roster.roster.characters.map((e) => e.character)
    expect(made.map((c) => c.name)).toEqual(['Grey wolf 1', 'Grey wolf 2', 'Grey wolf 3'])
    expect(made.every((c) => c.template?.id === 'grey-wolf')).toBe(true)
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
