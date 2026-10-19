import { loadPacks } from '@open-tabletop/oracle-engine'
import { systemUses, travelSystems, usesOf } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from '../../session/src/core.testing'
import { translator } from './i18n'
import { usesHelp } from './uses'

describe("the trip panel's help says what uses a name", () => {
  const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
  const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
  const uses = systemUses(registry, system)
  const nameOf = (id: string) => registry.definitions.get(id)?.name ?? id
  const help = (declared: Parameters<typeof usesOf>[1], locale = 'en') =>
    usesHelp(
      usesOf(uses, declared, system),
      system,
      locale,
      nameOf,
      translator(() => locale),
    )

  it("names the table that reads the guide, which the panel didn't say before", () => {
    expect(help({ kind: 'role', id: 'guide' })).toBe('**Read by:** Do we get lost?.')
  })

  it('says what reads and what changes a stat, by the names players know', () => {
    const fatigue = help({ kind: 'stat', id: 'fatigue' })
    expect(fatigue).toMatch(/^\*\*Read by:\*\* .*Camp/)
    expect(fatigue).toMatch(/\*\*Changed by:\*\* .*Rest/)
    // In Spanish, with the pack's translated names.
    expect(help({ kind: 'stat', id: 'fatigue' }, 'es')).toMatch(/^\*\*Lo leen:\*\* .*Acampar/)
  })

  it('says nothing for what nothing uses', () => {
    expect(help({ kind: 'stat', id: 'nobody' })).toBe('')
  })
})
