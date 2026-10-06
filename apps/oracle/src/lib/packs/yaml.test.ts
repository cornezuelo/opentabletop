import { describe, expect, it } from 'vitest'
import {
  appendDefinition,
  definitionIds,
  getOverlayText,
  insertIn,
  locate,
  moveIn,
  readDefinition,
  removeDefinition,
  removeIn,
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
})
