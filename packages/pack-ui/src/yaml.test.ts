import { describe, expect, it } from 'vitest'
import {
  appendDefinition,
  definitionIds,
  freeId,
  getOverlayText,
  insertIn,
  locate,
  moveIn,
  moveKey,
  readDefinition,
  removeDefinition,
  removeIn,
  renameKey,
  setIn,
  setOverlayText,
} from './yaml'

const FILE = `# Weather tables
kind: table
id: weather
roll: 1d6
entries:
  - { range: 1-3, result: Clear } # most days
  - { range: 4-6, result: Rain }
---
- kind: table
  id: herbs
  entries:
    - result: Sage
`

describe('structured YAML edits', () => {
  it('lists and reads definitions from documents and list files', () => {
    expect(definitionIds(FILE)).toEqual(['weather', 'herbs'])
    expect(readDefinition(FILE, 'herbs')).toMatchObject({
      kind: 'table',
      entries: [{ result: 'Sage' }],
    })
  })

  it('edits values and keeps comments', () => {
    const out = setIn(FILE, 'weather', ['entries', 1, 'result'], 'Storm')
    expect(out).toContain('# Weather tables')
    expect(out).toContain('# most days')
    expect(readDefinition(out, 'weather')?.entries).toEqual([
      { range: '1-3', result: 'Clear' },
      { range: '4-6', result: 'Storm' },
    ])
    expect(readDefinition(setIn(FILE, 'herbs', ['name'], 'Herbs'), 'herbs')?.name).toBe('Herbs')
    expect(readDefinition(setIn(FILE, 'weather', ['roll'], ''), 'weather')?.roll).toBeUndefined()
  })

  it('inserts, removes and moves entries', () => {
    let out = insertIn(FILE, 'weather', ['entries'], 2, { range: 7, result: 'Snow' })
    expect((readDefinition(out, 'weather')?.entries as unknown[]).length).toBe(3)
    out = moveIn(out, 'weather', ['entries'], 2, 0)
    expect((readDefinition(out, 'weather')?.entries as { result: string }[])[0].result).toBe('Snow')
    out = removeIn(out, 'weather', ['entries'], 0)
    expect((readDefinition(out, 'weather')?.entries as { result: string }[])[0].result).toBe(
      'Clear',
    )
  })

  it('appends and removes definitions', () => {
    const table = { kind: 'table', id: 'new', entries: [{ result: 'x' }] }
    expect(definitionIds(appendDefinition('', table))).toEqual(['new'])
    expect(
      definitionIds(appendDefinition('kind: table\nid: a\nentries: [{result: y}]\n', table)),
    ).toEqual(['a', 'new'])
    expect(definitionIds(appendDefinition(FILE, table))).toEqual(['weather', 'herbs', 'new'])
    expect(definitionIds(removeDefinition(FILE, 'weather'))).toEqual(['herbs'])
    expect(definitionIds(removeDefinition(FILE, 'herbs'))).toEqual(['weather'])
  })

  it('writes translation overlays', () => {
    const out = setOverlayText('', ['weather', 'entries', 'r1'], 'Despejado')
    expect(getOverlayText(out, ['weather', 'entries', 'r1'])).toBe('Despejado')
    expect(
      getOverlayText(setOverlayText(out, ['weather', 'entries', 'r1'], ''), [
        'weather',
        'entries',
        'r1',
      ]),
    ).toBe('')
  })

  it('finds the line of a diagnostic location', () => {
    expect(locate(FILE, 'weather.entries[1].range')).toBe(7)
    expect(locate(FILE, 'herbs.entries[0]')).toBe(12)
    expect(locate(FILE, 'weather.missing')).toBe(2)
    expect(locate('id: x\nversion: nope\n', 'pack.version')).toBe(2)
  })

  it('renames and moves map keys in place, keeping comments', () => {
    const GEN = `kind: generator
id: npc
fields:
  name: { table: names } # first
  mood: { roll: 1d6 }
  age: { value: 30 }
`
    const renamed = renameKey(GEN, 'npc', ['fields'], 'mood', 'temper')
    expect(Object.keys(readDefinition(renamed, 'npc')!.fields as object)).toEqual([
      'name',
      'temper',
      'age',
    ])
    expect(renamed).toContain('# first')
    expect(renameKey(GEN, 'npc', ['fields'], 'mood', 'age')).toBe(GEN)
    const moved = moveKey(GEN, 'npc', ['fields'], 'age', 0)
    expect(Object.keys(readDefinition(moved, 'npc')!.fields as object)).toEqual([
      'age',
      'name',
      'mood',
    ])
    expect(moveKey(GEN, 'npc', ['fields'], 'age', 3)).toBe(GEN)
  })

  it('finds free ids', () => {
    expect(freeId('weather', ['herbs'])).toBe('weather')
    expect(freeId('weather', ['weather', 'weather-2'])).toBe('weather-3')
  })
})

describe('locating by kind', () => {
  it('finds a definition by @kind when several share an id', () => {
    const FILE =
      'kind: travel-rules\nid: default\nchecks:\n  - { event: A, at: dawn }\n---\nkind: bindings\nid: default\non:\n  A: { resolve: nope }\n'
    expect(locate(FILE, '@travel-rules.checks.0.at')).toBe(4)
    expect(locate(FILE, '@bindings.on.A.resolve')).toBe(9)
  })
})
