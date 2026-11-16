import { loadPacks, type EntryList } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from '../../session/src/core.testing'
import { ruledOut } from './ruledOut'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const encounter = registry.definitions.get('grey-marches/encounter') as unknown as EntryList

describe('rows that can’t come up here', () => {
  it('the Grey Marches’ encounters on hills by day: the hunt, the lights, the patrol are out', () => {
    const here = {
      place: { terrain: 'hills', danger: 2, tags: [], region: '' },
      timeOfDay: 'day',
      time: { moons: { ember: 'new' } },
    }
    const out = ruledOut(encounter.entries, here)
    expect([...out]).toEqual(expect.arrayContaining(['hunt', 'lights', 'patrol']))
    // On hills, bandits can come; a row rolled in its condition may or may not (kept).
    expect(out.has('bandits')).toBe(false)
    expect(out.has('quiet')).toBe(false)
    // In the marsh at night, the hunt is still out (no full moon); the lights need haunting.
    const night = ruledOut(encounter.entries, { ...here, timeOfDay: 'night' })
    expect(night.has('hunt')).toBe(true)
    expect(night.has('patrol')).toBe(true)
  })

  it('with nothing known, nothing is ruled out', () => {
    expect(ruledOut(encounter.entries, {}).size).toBe(0)
  })
})
