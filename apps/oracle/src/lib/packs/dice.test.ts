import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded, sequence, type RandomSource } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { engineFiles } from '@open-tabletop/pack-ui'

/** RNG values that make a dN roll show the given faces, one die at a time. */
const faces = (n: number, ...values: number[]) => sequence(values.map((v) => (v - 1 + 0.5) / n))

/** A d100 showing `face` first, then whatever `rest` rolls. */
const then = (face: number, rest: RandomSource): RandomSource => {
  let first = true
  return { next: () => (first ? ((first = false), (face - 0.5) / 100) : rest.next()) }
}

describe('the dice of the bundled packs', () => {
  const { registry } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))
  const at = (
    id: string,
    random: RandomSource = seeded('dice'),
    context: Record<string, unknown> = {},
    mode?: string,
    locale = 'en',
  ) =>
    createOracleEngine({ registry, random, locale }).resolve(
      id,
      context,
      undefined,
      mode ? { mode } : undefined,
    ).resolution

  it('Core: Against the odds rolls under a chance, doubles making it more', () => {
    expect(at('core/against-the-odds', faces(100, 30), { chance: 40 })).toMatchObject({
      entry: 'yes',
      text: '30 against 40: it happens',
    })
    expect(at('core/against-the-odds', faces(100, 33), { chance: 40 }).entry).toBe('and')
    expect(at('core/against-the-odds', faces(100, 77), { chance: 40 }).entry).toBe('worse')
    expect(at('core/against-the-odds', faces(100, 72), { chance: 40 }).entry).toBe('no')
    // Either way: 72 read as 27, under the chance.
    const either = at('core/against-the-odds', faces(100, 72), { chance: 40 }, 'core/either-way')
    expect(either).toMatchObject({ entry: 'yes', mode: 'core/either-way' })
    expect(at('core/against-the-odds', faces(100, 33), { chance: 40 }, undefined, 'es').text).toBe(
      '33 contra 40: pasa, y algo más',
    )
  })

  it('Core: Trouble on the road brings more foes on a 3 (a die that explodes once)', () => {
    const counts = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const { value } = at('core/trouble', seeded(`trouble-${i}`))
      counts.add(Number((value.effects as Record<string, unknown>)['present.foe']))
    }
    expect([...counts].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6])
  })

  it('The Grey Marches: a hoard finds a cache on doubles, read either way when lucky', () => {
    // 44: doubles, the cache before the coins (its silver rolled on 3d6!), and a prize.
    const doubles = at('grey-marches/treasure', then(44, seeded('hoard')))
    expect(doubles.entry).toBe('cache')
    expect(doubles.children[0]?.source).toBe('grey-marches/prize')
    // A lucky search reads 19 as 91: the cordial instead of coins.
    const lucky = at('grey-marches/treasure', then(19, seeded('lucky')), {}, 'grey-marches/lucky')
    expect(lucky).toMatchObject({ entry: 'potion', mode: 'grey-marches/lucky' })
    expect(at('grey-marches/treasure', then(19, seeded('plain'))).entry).toBe('coins')
  })
})
