/**
 * A table from pasted text: a numbered list copied from a PDF ("1. Wolves", "2–3 Bandits",
 * "11-16 a wyrm sleeps…"), a CSV or spreadsheet copy ("1,Wolves", "2-3<tab>Bandits"), or a
 * plain list (one entry per line, equally likely). The roll is guessed from the numbers.
 */

export interface TextEntry {
  range?: string
  result: string
}

export interface TableFromText {
  /** The dice that fit the numbers (`1d6`, `2d6`, `d66`, `d100`…); none for a plain list. */
  roll?: string
  entries: TextEntry[]
  /** Lines left out, by number (1-based), when the others are numbered. */
  skipped: number[]
}

/** "4", "2-3", "2–3", "01–05", "00" (100 on percentile tables), then the text. */
const NUMBERED = /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*(?:[.):;,\t|]|\s-\s)?\s*(.*)$/

export function tableFromText(text: string): TableFromText {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const parsed = lines.map((line, i) => {
    const m = NUMBERED.exec(line)
    if (!line) return { i, kind: 'blank' as const }
    if (m && m[3] !== undefined && (m[3] !== '' || m[2] !== undefined))
      return {
        i,
        kind: 'numbered' as const,
        min: number(m[1]),
        max: number(m[2] ?? m[1]),
        result: clean(m[3]),
      }
    return { i, kind: 'text' as const, result: clean(line) }
  })
  const numbered = parsed.filter((p) => p.kind === 'numbered')
  if (!numbered.length) {
    const entries = parsed.flatMap((p) =>
      p.kind === 'text' && p.result ? [{ result: p.result }] : [],
    )
    return { entries, skipped: [] }
  }
  // Numbered lines are entries; text lines after one continue it (a line wrapped in a PDF).
  const entries: (TextEntry & { min: number; max: number })[] = []
  const skipped: number[] = []
  for (const p of parsed) {
    if (p.kind === 'numbered') entries.push({ min: p.min, max: p.max, result: p.result, range: '' })
    else if (p.kind === 'text') {
      const last = entries.at(-1)
      if (last) last.result = `${last.result} ${p.result}`.trim()
      else skipped.push(p.i + 1)
    }
  }
  // "00" on a 1–100 table is 100.
  const top = Math.max(...entries.map((e) => e.max))
  for (const e of entries) {
    if (e.min === 0 && top >= 90) e.min = 100
    if (e.max === 0 && top >= 90) e.max = 100
    if (e.max < e.min) [e.min, e.max] = [e.max, e.min]
  }
  return {
    roll: guessRoll(entries),
    entries: entries.map(({ min, max, result }) => ({
      range: min === max ? String(min) : `${min}-${max}`,
      result,
    })),
    skipped,
  }
}

function guessRoll(entries: { min: number; max: number }[]): string {
  const min = Math.min(...entries.map((e) => e.min))
  const max = Math.max(...entries.map((e) => e.max))
  const d66 = entries.every((e) => [e.min, e.max].every((n) => /^[1-6][1-6]$/.test(String(n))))
  if (d66 && min >= 11 && max <= 66 && max > 20) return 'd66'
  if (min >= 2 && max === 12) return '2d6'
  if (min >= 3 && max === 18) return '3d6'
  if (max === 100) return 'd100'
  return `1d${max}`
}

const number = (s: string) => Number(s)

/** Trims the text and the quotes a CSV puts around it. */
function clean(text: string): string {
  const t = text.trim()
  return /^".*"$/.test(t) ? t.slice(1, -1).replaceAll('""', '"').trim() : t
}
