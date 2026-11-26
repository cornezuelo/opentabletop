import {
  applyCharacter,
  createCharacter,
  parseSheet,
  valueParts,
} from '@open-tabletop/character-engine'
import { loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from '../../session/src/core.testing'
import { newMember } from '../../session/src/party'
import { partyOf } from '../../session/src/trip'
import { breakdownRows } from './breakdown'
import CharacterGlance from './CharacterGlance.svelte'
import { translator } from './i18n'
import ValueBreakdown from './ValueBreakdown.svelte'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const marches = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
const rules = partyOf(marches)
const sheet = rules.sheet!.def
const names = {
  value: (id: string) =>
    ({ stealth: 'Stealth', maxHealth: 'Max health', capacity: 'Capacity' })[id] ?? id,
  condition: (id: string) => (id === 'burdened' ? 'Burdened' : id),
  item: (p: { id: string }) => (p.id === 'mail' ? 'Mail shirt' : p.id),
}

describe("a value's breakdown, on the Grey Marches' companion", () => {
  const t = translator(() => 'en')
  const kael = newMember(rules, { id: 'kael', name: 'Kael', values: { stealth: 3 } })

  /** A breakdown's rows as `label amount` (a signed one with its sign). */
  const said = (id: string, character: typeof kael) =>
    breakdownRows(valueParts(sheet, character, id), names, t).map((r) =>
      r.amount === undefined
        ? r.label
        : `${r.label} ${r.kind === 'signed' && r.amount >= 0 ? '+' : ''}${r.amount}`,
    )

  it('a condition adding: Base 3, Burdened −1, Now 2', () => {
    const burdened = { ...kael, conditions: { burdened: {} } }
    expect(valueParts(sheet, burdened, 'stealth')).toMatchObject({ now: 2, base: 3 })
    expect(said('stealth', burdened)).toEqual(['Base 3', 'Burdened -1', 'Now 2'])
    // Nothing adding, nothing to say.
    expect(said('stealth', kael)).toEqual([])
  })

  it('made of other values, or of the items worn', () => {
    const capacity = valueParts(sheet, kael, 'capacity')
    expect(said('capacity', kael)).toEqual([
      `Max health ${kael.values.maxHealth}`,
      'Max health × 2 + 2',
      `Total ${capacity.base}`,
    ])
    const worn = applyCharacter(
      sheet,
      kael,
      { type: 'change', effects: { 'items.mail': 1 } },
      { items: rules.items },
    ).state
    const armour = valueParts(sheet, worn, 'armour')
    expect(armour.made?.how).toBe('max')
    expect(said('armour', worn)).toEqual([
      `Mail shirt (the highest) ${armour.base}`,
      `Total ${armour.base}`,
    ])
  })

  it("what's worn adds to a value kept (plus): Base 2, the fen-walker's cloak +1, Now 3", () => {
    const mara = newMember(rules, { id: 'mara', name: 'Mara', values: { stealth: 2 } })
    const cloaked = applyCharacter(
      sheet,
      mara,
      { type: 'change', effects: { 'items.fen-cloak': 1 } },
      { items: rules.items },
    ).state
    const cloak = cloaked.items!.find((i) => i.id === 'fen-cloak')!
    expect(cloak.place).toBe('body')
    expect(valueParts(sheet, cloaked, 'stealth')).toMatchObject({ base: 2, now: 3 })
    expect(said('stealth', cloaked)).toEqual(['Base 2', 'fen-cloak +1', 'Now 3'])
    // On the belt it adds nothing.
    const belted = applyCharacter(sheet, cloaked, {
      type: 'moveItem',
      key: cloak.key,
      place: 'belt',
    }).state
    expect(said('stealth', belted)).toEqual([])
  })

  it('a bound that held it says what it would have been', () => {
    const { sheet: small } = parseSheet({
      kind: 'sheet',
      id: 'small',
      values: { health: { default: 1, min: 0 } },
      conditions: { weak: { adds: { health: -3 } } },
    })
    const weak = createCharacter(small!, 'test/small', { id: 'ana', conditions: { weak: {} } })
    expect(breakdownRows(valueParts(small!, weak, 'health'), names, t).map((r) => r.label)).toEqual(
      ['Base', 'weak', 'Minimum 0 (would be -2)', 'Now'],
    )
  })

  it('on the card: what it reads now beside its base, the sum on a click; a glance shows what it reads now', () => {
    const burdened = { ...kael, conditions: { burdened: {} } }
    const card = render(ValueBreakdown, {
      props: { sheet, character: burdened, id: 'stealth', locale: 'es' },
    }).body
    expect(card).toContain('<strong>2</strong>')
    expect(card).toContain('↓')
    expect(card).toContain('Qué lo deja en 2')
    // Nothing differing nor made of others: nothing beside the control.
    expect(
      render(ValueBreakdown, { props: { sheet, character: kael, id: 'stealth', locale: 'en' } })
        .body,
    ).not.toContain('button')
    // A glance (a fight's card) reads it now, marked, and tells why nowhere but the sheet.
    const { sheet: small } = parseSheet({
      kind: 'sheet',
      id: 'small',
      main: 'health',
      values: { health: { default: 4, min: 0, max: 6 } },
      conditions: { weak: { adds: { health: -1 } } },
    })
    const weak = createCharacter(small!, 'test/small', { id: 'ana', conditions: { weak: {} } })
    const glance = render(CharacterGlance, {
      props: { sheet: small!, character: weak, locale: 'en' },
    }).body
    expect(glance).toContain('3 / 6')
    expect(glance).toContain('↓')
  })
})
