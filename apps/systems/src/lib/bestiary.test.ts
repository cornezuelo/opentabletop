import type { TemplateDef } from '@open-tabletop/character-engine'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bestiaryOf, shownTemplate, writeTemplate } from './bestiary'
import { setLocale } from './i18n'
import { systemParts } from './newSystem'
import { library, systems } from './packs.svelte'
import { partDoc } from './partDoc.svelte'

/**
 * The Bestiary tab, the one place templates are edited: each template's card is
 * character-ui's `TemplateEditor`, whose changes are written where they belong.
 */
describe('templates edited in Systems', () => {
  // The language is set on the page too: a bare one is enough here.
  vi.stubGlobal('document', { documentElement: {} })
  afterEach(() => {
    setLocale('en')
    const root = library.rootOf('grey-marches')
    if (root && library.isEditable(root)) library.removePack('grey-marches')
  })

  const marches = () => systems.get('grey-marches')!
  const part = () => systemParts(marches(), 'bestiary')[0]

  it("finds the bestiary a part is, with each template's sheet", () => {
    const read = bestiaryOf(marches(), part())!
    expect(read.id).toBe('grey-marches/marches')
    expect(read.sheets['grey-wolf']).toBe('grey-marches/foe')
    expect(marches().templateSheets?.[read.sheets['grey-wolf']]?.values.health).toBeDefined()
  })

  it('writes texts in the language being edited, the rest only where it changed', () => {
    library.editCopy('grey-marches')
    const root = library.rootOf('grey-marches')!
    const doc = partDoc(() => part())
    const raw = () => (doc.data().templates as Record<string, TemplateDef>)['grey-wolf']
    setLocale('es')
    const before = shownTemplate(doc, 'grey-wolf', raw())
    expect(typeof before.name).toBe('string')
    writeTemplate(doc, 'grey-wolf', raw(), before, { ...before, name: 'Lobo flaco' })
    expect(library.readFile(root, 'locales/es/bestiary.yaml')).toContain('name: Lobo flaco')
    const now = shownTemplate(doc, 'grey-wolf', raw())
    expect(now.name).toBe('Lobo flaco')
    writeTemplate(doc, 'grey-wolf', raw(), now, { ...now, tags: ['beast'] })
    const base = library.readFile(root, 'bestiary.yaml')!
    expect(base).toContain('name: Grey wolf')
    expect(base).not.toContain('Lobo')
    expect(marches().bestiary?.[0].def.templates['grey-wolf'].tags).toEqual(['beast'])
    // Emptied, a value is left out of the file.
    writeTemplate(doc, 'grey-wolf', raw(), shownTemplate(doc, 'grey-wolf', raw()), {
      ...shownTemplate(doc, 'grey-wolf', raw()),
      tags: undefined,
    })
    expect(raw().tags).toBeUndefined()
  }, 30_000)
})
