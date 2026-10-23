import { loadPacks } from '@open-tabletop/oracle-engine'
import { passesFilter } from '@open-tabletop/oracle-ui'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'
import { engineFiles } from './workspace'

describe("the bundled packs' tags", () => {
  const { registry } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))
  const ours = [...registry.definitions.values()].filter((d) =>
    ['core', 'grey-marches'].includes(d.pack),
  )
  const shown = (tags: Record<string, 'only' | 'not'>, kinds: string[] = []) =>
    ours
      .filter((d) => passesFilter(d, { kinds, tags }))
      .map((d) => d.id)
      .sort()

  it('sort every rollable of Core and the Grey Marches', () => {
    expect(ours.filter((d) => !d.tags.length).map((d) => d.id)).toEqual([])
  })

  it('leave what is rolled by hand once the rules are hidden', () => {
    const byHand = shown({ rules: 'not' })
    expect(byHand).toContain('core/yes-no')
    expect(byHand).toContain('grey-marches/gates')
    expect(byHand).toContain('grey-marches/npc')
    expect(byHand).not.toContain('grey-marches/encounter')
    expect(byHand).not.toContain('grey-marches/weather')
    expect(byHand).not.toContain('grey-marches/omens')
  })

  it('narrow by kind and tag together', () => {
    expect(shown({ names: 'only' })).toEqual(['grey-marches/npc-names'])
    expect(shown({ rules: 'only' }, ['deck'])).toEqual(['grey-marches/omens'])
  })
})
