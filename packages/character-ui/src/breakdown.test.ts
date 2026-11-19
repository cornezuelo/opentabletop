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
import { breakdownLines } from './breakdown'
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

  it('a condition adding: Stealth 2 = 3 − 1 Burdened', () => {
    const burdened = { ...kael, conditions: { burdened: {} } }
    const parts = valueParts(sheet, burdened, 'stealth')
    expect(parts).toMatchObject({ now: 2, base: 3 })
    expect(breakdownLines('stealth', parts, names, t)).toEqual(['Stealth 2 = 3 − 1 Burdened'])
    // Nothing adding, nothing to say.
    expect(breakdownLines('stealth', valueParts(sheet, kael, 'stealth'), names, t)).toEqual([])
  })

  it('made of other values, or of the items worn', () => {
    const capacity = valueParts(sheet, kael, 'capacity')
    expect(breakdownLines('capacity', capacity, names, t)).toEqual([
      `Capacity ${capacity.base} = Max health ${kael.values.maxHealth} × 2 + 2`,
    ])
    const worn = applyCharacter(
      sheet,
      kael,
      { type: 'change', effects: { 'items.mail': 1 } },
      { items: rules.items },
    ).state
    const armour = valueParts(sheet, worn, 'armour')
    expect(armour.made?.how).toBe('max')
    expect(breakdownLines('armour', armour, names, t)).toEqual([
      `armour ${armour.base} = Mail shirt, the highest`,
    ])
  })

  it('on the card: Reads 2 now ↓ (the sum folded under it); a glance shows what it reads now', () => {
    const burdened = { ...kael, conditions: { burdened: {} } }
    const card = render(ValueBreakdown, {
      props: { sheet, character: burdened, id: 'stealth', locale: 'es' },
    }).body
    expect(card).toContain('Ahora se lee 2')
    expect(card).toContain('↓')
    expect(
      render(ValueBreakdown, { props: { sheet, character: kael, id: 'stealth', locale: 'en' } })
        .body,
    ).not.toContain('Reads')
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
