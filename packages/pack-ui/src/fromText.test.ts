import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { tableFromText } from './fromText'

describe('tables from pasted text', () => {
  it('reads a numbered list, its ranges and the dice that fit', () => {
    expect(
      tableFromText(`
1. Wolves
2–3 Bandits on the road
4) A pedlar
5-6: Nothing`),
    ).toEqual({
      roll: '1d6',
      entries: [
        { range: '1', result: 'Wolves' },
        { range: '2-3', result: 'Bandits on the road' },
        { range: '4', result: 'A pedlar' },
        { range: '5-6', result: 'Nothing' },
      ],
      skipped: [],
    })
  })

  it('joins lines a PDF wrapped, and leaves out a heading before the list', () => {
    const t = tableFromText('Encounters in the hills\n1-3 A rockslide blocks\nthe pass\n4-6 Goats')
    expect(t.entries).toEqual([
      { range: '1-3', result: 'A rockslide blocks the pass' },
      { range: '4-6', result: 'Goats' },
    ])
    expect(t.skipped).toEqual([1])
  })

  it('guesses 2d6, d66 and d100, with 00 as 100', () => {
    expect(tableFromText('2-6 Hostile\n7-9 Unsure\n10-12 Friendly').roll).toBe('2d6')
    expect(tableFromText('11-16 a wyrm\n21-36 salt\n41-66 hills').roll).toBe('d66')
    const pct = tableFromText('01-50 coins\n51-99 gems\n00 a crown')
    expect(pct.roll).toBe('d100')
    expect(pct.entries.at(-1)).toEqual({ range: '100', result: 'a crown' })
  })

  it('reads CSV and spreadsheet copies', () => {
    expect(tableFromText('1,Wolves\n2-3,"Bandits, many"\n4\tPedlar').entries).toEqual([
      { range: '1', result: 'Wolves' },
      { range: '2-3', result: 'Bandits, many' },
      { range: '4', result: 'Pedlar' },
    ])
  })

  it('makes a plain list equally likely', () => {
    expect(tableFromText('Aldo\nBrenna\n\nCorin')).toEqual({
      entries: [{ result: 'Aldo' }, { result: 'Brenna' }, { result: 'Corin' }],
      skipped: [],
    })
  })

  it('makes tables that load and roll', () => {
    const made = tableFromText('01-50 coins\n51-99 gems\n00 a crown')
    const { registry, diagnostics } = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/t.yaml',
        content: JSON.stringify({
          kind: 'table',
          id: 'hoard',
          roll: made.roll,
          entries: made.entries,
        }),
      },
    ])
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    const engine = createOracleEngine({ registry, random: seeded('hoard') })
    const texts = new Set(
      Array.from({ length: 300 }, () => engine.resolve('p/hoard').resolution.text),
    )
    expect(texts).toEqual(new Set(['coins', 'gems', 'a crown']))
  })
})
