import type { ValueParts } from '@open-tabletop/character-engine'
import type { Translate } from './i18n'

/** The names a breakdown says: a value's, a condition's, an item's. */
export interface BreakdownNames {
  value: (id: string) => string
  condition: (id: string) => string
  item: (part: { key: string; id: string }) => string
}

/**
 * One row of a value's breakdown: what it is and its number. `signed` rows add to what's
 * above them (_Burdened −1_); a `total` closes a sum (_Now 3_); a `note` has no number of
 * its own (a formula in words, a bound that held it).
 */
export interface BreakdownRow {
  label: string
  amount?: number
  kind: 'part' | 'signed' | 'total' | 'note'
}

/**
 * Why a value reads what it does, as the rows of a small sum (docs/value-breakdown.md):
 * what makes a value made of others (each value its formula reads and the formula in words,
 * each item that counts), then its base and what its conditions add, the bound that held it,
 * and what it reads now. Empty when nothing makes a difference.
 */
export function breakdownRows(
  parts: ValueParts,
  names: BreakdownNames,
  t: Translate,
): BreakdownRow[] {
  const rows: BreakdownRow[] = []
  const made = parts.made
  if (made?.formula !== undefined) {
    for (const p of made.parts)
      rows.push({ label: names.value(p.id), amount: p.amount, kind: 'part' })
    const said = made.formula
      .replace(/self\.values\.([\w-]+)/g, (_, v: string) => names.value(v))
      .replace(/\s*\*\s*/g, ' × ')
      .replace(/\s*\/\s*/g, ' ÷ ')
    rows.push({ label: said, kind: 'note' })
  } else if (made) {
    const items = made.parts.flatMap((p) => (p.kind === 'item' ? [p] : []))
    if (!items.length) rows.push({ label: t('breakdown.none'), kind: 'note' })
    else if (made.how === 'max' || made.how === 'min')
      rows.push({
        label: `${names.item(items[0]!)} (${t(made.how === 'max' ? 'breakdown.highest' : 'breakdown.lowest')})`,
        amount: items[0]!.amount,
        kind: 'part',
      })
    else
      for (const p of items)
        rows.push({
          label: `${names.item(p)}${p.count > 1 && made.how === 'sum' ? ` ×${p.count}` : ''}`,
          amount: p.amount,
          kind: 'part',
        })
  }
  if (made)
    rows.push({
      label: t(parts.adds.length ? 'breakdown.made' : 'breakdown.total'),
      amount: parts.base,
      kind: 'total',
    })
  if (parts.adds.length) {
    if (!made) rows.push({ label: t('breakdown.base'), amount: parts.base, kind: 'part' })
    for (const a of parts.adds)
      rows.push({ label: names.condition(a.condition), amount: a.amount, kind: 'signed' })
    if (parts.held)
      rows.push({
        label: t('breakdown.held', {
          which: t(`breakdown.${parts.held.which}`),
          at: parts.held.at,
          sum: parts.adds.reduce((n, a) => n + a.amount, parts.base),
        }),
        kind: 'note',
      })
    rows.push({ label: t('breakdown.now'), amount: parts.now, kind: 'total' })
  }
  return rows
}
