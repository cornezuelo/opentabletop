import { describe, expect, it } from 'vitest'
import { filterEntries, groupEntries, type ListEntry } from './groups'

/** The left column's lists: by system, then by the sheet each is made with; search and tags. */
const entry = (key: string, system: string, sheet: string, tags: string[] = []): ListEntry => ({
  key,
  name: key,
  tags,
  system,
  systemTitle: system || 'Other sheets',
  sheet,
  sheetTitle: sheet,
})

const roster = [
  entry('wolf', 'marches', 'foe', ['beast']),
  entry('lost', '', 'gone'),
  entry('kael', 'marches', 'companion', ['pc']),
  entry('hrolf', 'marches', 'companion', ['npc', 'bandit']),
  entry('tobin', 'generic', 'character', ['pc']),
]
const order = ['generic', 'marches']
const first = (system: string) => ({ marches: 'companion', generic: 'character' })[system]

describe('the left column’s lists', () => {
  it('groups by system in the systems’ order, then by sheet, the characters’ sheet first', () => {
    const groups = groupEntries(roster, (s) => order.indexOf(s), first)
    expect(groups.map((g) => g.system)).toEqual(['generic', 'marches', ''])
    expect(groups[1].sheets.map((s) => s.sheet)).toEqual(['companion', 'foe'])
    expect(groups[1].sheets[0].entries.map((e) => e.key)).toEqual(['kael', 'hrolf'])
  })

  it('keeps the entries with every tag chosen, and those that match the search', () => {
    expect(filterEntries(roster, '', ['pc']).map((e) => e.key)).toEqual(['kael', 'tobin'])
    expect(filterEntries(roster, '', ['npc', 'bandit']).map((e) => e.key)).toEqual(['hrolf'])
    expect(filterEntries(roster, 'BEAST', []).map((e) => e.key)).toEqual(['wolf'])
    expect(filterEntries(roster, 'k', ['pc']).map((e) => e.key)).toEqual(['kael'])
  })
})
