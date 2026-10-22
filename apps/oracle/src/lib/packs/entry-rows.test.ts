import { conditionRows, pairRows, rowsCondition, rowsPairs } from '@open-tabletop/pack-ui'
import { parseAllDocuments } from 'yaml'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'

/** Every list of entries in a definition (a table's, an oracle variant's), however deep. */
function entryLists(node: unknown, out: Record<string, unknown>[][] = []) {
  if (Array.isArray(node)) node.forEach((n) => entryLists(n, out))
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node))
      if (key === 'entries' && Array.isArray(value)) out.push(value as Record<string, unknown>[])
      else entryLists(value, out)
  }
  return out
}

describe("the bundled tables' entries as rows", () => {
  it('every condition, value set and change that has rows writes back the same', () => {
    let conditions = 0
    let maps = 0
    let yaml = 0
    for (const pack of bundledPacks)
      for (const file of pack.files.filter((f) => /\.ya?ml$/.test(f.path)))
        for (const doc of parseAllDocuments(file.content))
          for (const entries of entryLists(doc.toJS()))
            for (const entry of entries) {
              for (const c of [entry.when, entry.unless].filter(Boolean)) {
                const rows = conditionRows(c)
                if (!rows) {
                  yaml++
                  continue
                }
                conditions++
                expect(rowsCondition(rows), `${file.path}: ${JSON.stringify(c)}`).toEqual(c)
              }
              for (const map of [entry.set, entry.effects].filter(Boolean)) {
                const rows = pairRows(map)
                if (!rows) {
                  yaml++
                  continue
                }
                maps++
                expect(rowsPairs(rows), `${file.path}: ${JSON.stringify(map)}`).toEqual(map)
              }
            }
    expect(conditions).toBeGreaterThan(20)
    expect(maps).toBeGreaterThan(10)
    expect(yaml).toBeLessThan((conditions + maps) / 4)
  })
})
