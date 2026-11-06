import { describe, expect, it } from 'vitest'
import { coreSystem } from '../../session/src/core.testing'
import { terrainChoiceGroups, terrainChoices } from './terrains'

const core = coreSystem()

describe('terrainChoiceGroups', () => {
  it("holds every choice once, in Map's palette groups, and no empty group", () => {
    const groups = terrainChoiceGroups(core)
    expect(groups.flatMap((g) => g.terrains).sort()).toEqual(terrainChoices(core).sort())
    expect(groups.every((g) => g.terrains.length)).toBe(true)
    expect(groups.find((g) => g.id === 'space')?.terrains).toContain('space')
    expect(groups.find((g) => g.id === 'water')?.terrains).toContain('sea')
  })

  it('puts a terrain only the system names under other', () => {
    const system = {
      ...core,
      rules: { ...core.rules, terrains: { ...core.rules.terrains, ashfall: {} } },
    }
    expect(terrainChoiceGroups(system).find((g) => g.id === 'other')?.terrains).toContain('ashfall')
  })
})
