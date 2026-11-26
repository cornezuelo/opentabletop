import { describe, expect, it } from 'vitest'
import { momentRoller } from '@open-tabletop/variables'
import {
  copyOf,
  countOf,
  lookupItems,
  lookupTemplates,
  parseBestiary,
  parseCatalogue,
  parseSheet,
  resolveTemplate,
  type Sheet,
} from './index'

// Made-up sheets and templates: a beast with health and a condition that takes it off.
const beast = parseSheet({
  kind: 'sheet',
  id: 'beast',
  values: { health: { default: 3, min: 0 }, bite: { default: 1 } },
  conditions: { down: { when: { 'self.values.health': { lte: 0 } }, leaves: true }, wary: {} },
  items: { start: { pelt: 1 } },
}).sheet as Sheet
const gear = parseCatalogue({
  kind: 'items',
  id: 'gear',
  items: { pelt: { name: 'Pelt' }, knife: { name: 'Knife' } },
}).catalogue!

const raw = {
  kind: 'bestiary',
  id: 'beasts',
  sheet: 'sheet.beast',
  behind: 'leave',
  templates: {
    wolf: { name: 'Wolf', tags: ['pack'], values: { health: '{{2d4}}', bite: 2 } },
    leader: { like: 'wolf', name: 'Leader', tags: ['leader'], values: { bite: 3 } },
    old: { like: 'leader', conditions: ['wary'], behind: 'stay' },
    bandit: { sheet: 'sheet.person', items: { knife: 1 } },
  },
}

describe('bestiary', () => {
  it('reads a bestiary and its variants', () => {
    const { bestiary, errors } = parseBestiary(raw)
    expect(errors).toEqual([])
    const leader = resolveTemplate(bestiary!, 'leader')!
    expect(leader.name).toBe('Leader')
    expect(leader.values).toEqual({ health: '{{2d4}}', bite: 3 })
    expect(leader.tags).toEqual(['pack', 'leader'])
    expect(leader.sheet).toBe('sheet.beast')
    expect(leader.behind).toBe('leave')
    const old = resolveTemplate(bestiary!, 'old')!
    expect(old.conditions).toEqual(['wary'])
    expect(old.behind).toBe('stay')
    expect(resolveTemplate(bestiary!, 'bandit')!.sheet).toBe('sheet.person')
    expect(leader.fights).toBe(true)
  })

  it("a template that doesn't fight, and its variants unless they say so", () => {
    const { bestiary, errors } = parseBestiary({
      ...raw,
      templates: {
        chest: { name: 'Chest', fights: false },
        coffer: { like: 'chest' },
        mimic: { like: 'chest', fights: true },
        fighters: { name: 'Not an id' },
      },
    })
    expect(errors).toEqual([
      'templates.fighters: "fighters" can\'t be a template\'s id (present.fighters reads every copy)',
    ])
    expect(bestiary).toBeUndefined()
    const ok = parseBestiary({
      ...raw,
      templates: {
        chest: { name: 'Chest', fights: false },
        coffer: { like: 'chest' },
        mimic: { like: 'chest', fights: true },
      },
    }).bestiary!
    expect(resolveTemplate(ok, 'chest')!.fights).toBe(false)
    expect(resolveTemplate(ok, 'coffer')!.fights).toBe(false)
    expect(resolveTemplate(ok, 'mimic')!.fights).toBe(true)
  })

  it("side: the party's allies, which follow it unless they say they don't", () => {
    const { bestiary, errors } = parseBestiary({
      ...raw,
      side: 'party',
      templates: {
        hound: { name: 'Hound' },
        pup: { like: 'hound', follows: false },
        stray: { name: 'Stray', side: 'foes' },
      },
    })
    expect(errors).toEqual([])
    expect(resolveTemplate(bestiary!, 'hound')).toMatchObject({ side: 'party', follows: true })
    expect(resolveTemplate(bestiary!, 'pup')!.side).toBe('party')
    expect(resolveTemplate(bestiary!, 'pup')!.follows).toBeUndefined()
    expect(resolveTemplate(bestiary!, 'stray')).toMatchObject({ side: 'foes' })
    expect(resolveTemplate(bestiary!, 'stray')!.follows).toBeUndefined()
    expect(parseBestiary({ ...raw, side: 'friends' }).errors).toHaveLength(1)
  })

  it("follows: the bestiary's, a template's, a variant's and a condition checked", () => {
    const chase = { not: { 'acting.conditions': 'fed' } }
    const { bestiary, errors } = parseBestiary({
      ...raw,
      follows: true,
      templates: {
        wolf: { name: 'Wolf', follows: chase },
        cub: { like: 'wolf' },
        tame: { like: 'wolf', follows: false },
        bear: { name: 'Bear' },
      },
    })
    expect(errors).toEqual([])
    expect(resolveTemplate(bestiary!, 'wolf')!.follows).toEqual(chase)
    expect(resolveTemplate(bestiary!, 'cub')!.follows).toEqual(chase)
    expect(resolveTemplate(bestiary!, 'tame')!.follows).toBeUndefined()
    expect(resolveTemplate(bestiary!, 'bear')!.follows).toBe(true)
    expect(resolveTemplate(parseBestiary(raw).bestiary!, 'wolf')!.follows).toBeUndefined()
    expect(
      parseBestiary({ ...raw, templates: { wolf: { follows: { danger: { between: [1, 2] } } } } })
        .errors,
    ).toEqual(['templates.wolf.follows.danger: unknown operator "between"'])
  })

  it('refuses reserved ids, unknown variants and loops', () => {
    const { errors } = parseBestiary({
      kind: 'bestiary',
      id: 'x',
      templates: {
        all: { sheet: 'sheet.a' },
        a: { like: 'b', sheet: 'sheet.a' },
        b: { like: 'a' },
        c: { like: 'nobody', sheet: 'sheet.a' },
        d: {},
      },
    })
    expect(errors.some((e) => e.startsWith('templates.all:'))).toBe(true)
    expect(errors.some((e) => e.startsWith('templates.a.like: a variant of itself'))).toBe(true)
    expect(errors).toContain('templates.c.like: no template "nobody" in this bestiary')
    expect(errors.some((e) => e.startsWith('templates.d.sheet: no sheet'))).toBe(true)
  })

  it('makes copies that roll their own values', () => {
    const { bestiary } = parseBestiary(raw)
    const find = lookupTemplates([{ id: 'p/beasts', def: bestiary! }])
    const { template, bestiary: from } = find('wolf')!
    expect(from).toBe('p/beasts')
    const copies = [1, 2, 3, 4, 5, 6].map((n) =>
      copyOf(
        beast,
        'p/beast',
        template,
        { id: `wolf-${n}`, from },
        {
          roller: momentRoller(`seed|wolf-${n}`),
          items: lookupItems([{ id: 'p/gear', def: gear }]),
        },
      ),
    )
    for (const c of copies) {
      expect(c.values.health).toBeGreaterThanOrEqual(2)
      expect(c.values.health).toBeLessThanOrEqual(8)
      expect(c.values.bite).toBe(2)
      expect(c.template).toEqual({ id: 'wolf', from: 'p/beasts' })
      expect(c.tags).toEqual(['pack'])
      // Nothing written for its items: the sheet's start.
      expect(countOf(c, 'pelt')).toBe(1)
    }
    // Each one rolled its own.
    expect(new Set(copies.map((c) => c.values.health)).size).toBeGreaterThan(1)
  })

  it("gives a template's items instead of the sheet's start", () => {
    const { bestiary } = parseBestiary({
      ...raw,
      templates: { cub: { values: { health: 1 }, items: { knife: '{{1d1+1}}' } } },
    })
    const { template } = lookupTemplates([{ id: 'p/beasts', def: bestiary! }])('cub')!
    const cub = copyOf(
      beast,
      'p/beast',
      template,
      { id: 'cub', name: 'Cub', from: 'p/beasts' },
      { roller: momentRoller('x'), items: lookupItems([{ id: 'p/gear', def: gear }]) },
    )
    expect(cub.name).toBe('Cub')
    expect(countOf(cub, 'knife')).toBe(2)
    expect(countOf(cub, 'pelt')).toBe(0)
  })
})
