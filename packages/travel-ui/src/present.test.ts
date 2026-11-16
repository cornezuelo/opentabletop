import { loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from '../../session/src/core.testing'
import { templateChoices } from './present'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const marches = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!

describe('what those present are', () => {
  it('each template says what it is in its own words, not how the pack shows it', () => {
    const choices = templateChoices(marches, 'en')
    const traveller = choices.find((c) => c.id === 'traveller')!
    expect(traveller.name).toBe('Traveller')
    expect(traveller.description).toBe('Someone met on the road, with business of their own.')
    // The pack's own notes (**Shows:** …) are left out: a second paragraph.
    for (const c of choices) expect(c.description).not.toContain('**Shows:**')
    const es = templateChoices(marches, 'es').find((c) => c.id === 'traveller')!
    expect(es.description).not.toBe(traveller.description)
  })
})
