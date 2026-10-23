import { describe, expect, it } from 'vitest'
import { systems } from './packs.svelte'
import { knownName, sheetScope, shownPlace, usesFor } from './usage'

describe('where a name is used, in Systems', () => {
  const system = systems.get('grey-marches')!

  it('finds the values a value made of others and a condition that holds by itself read', () => {
    const health = usesFor(system, { kind: 'sheet-value', sheet: 'members', id: 'health' })
    expect(health.map((u) => u.at.path)).toContain('values.wounds.from')
    const dread = usesFor(system, { kind: 'sheet-value', sheet: 'members', id: 'dread' })
    expect(dread.map((u) => u.at.path)).toContain('conditions.terrified.when')
  })

  it("shows the guide's Pathfinding in the table that reads it, with a link to the Oracle", () => {
    expect(sheetScope(system, 'companion')).toBe('members')
    expect(sheetScope(system, 'company')).toBe('party')
    const uses = usesFor(system, { kind: 'sheet-value', sheet: 'members', id: 'pathfinding' })
    const places = uses.map((u) => shownPlace(system, u))
    expect(places).toContainEqual(
      expect.objectContaining({
        kind: 'table',
        part: 'modeWhen.advantage',
        href: expect.stringContaining('#/def/grey-marches/getting-lost/edit'),
      }),
    )
    // The stat made of it, in the Checks tab.
    expect(places).toContainEqual(
      expect.objectContaining({ kind: 'stat', part: 'from', tab: 'checks' }),
    )
  })

  it('names actions and checks by their names, in their tabs', () => {
    const places = usesFor(system, { kind: 'stat', id: 'fatigue' }).map((u) =>
      shownPlace(system, u),
    )
    expect(places).toContainEqual(
      expect.objectContaining({
        kind: 'action',
        name: 'Rest',
        part: 'do[1].effects',
        tab: 'rules',
      }),
    )
    expect(places.some((p) => p.kind === 'check' && p.tab === 'checks')).toBe(true)
  })

  it('tells a typo from a name the system or the engines give', () => {
    expect(knownName(system, 'roles.guide.values.pathfinding')).toBe(true)
    expect(knownName(system, 'party.stats.morale')).toBe(true)
    expect(knownName(system, 'trip.marched')).toBe(true)
    expect(knownName(system, 'roles.guide.values.pathfindng')).toBe(false)
  })
})
