import type { ValueParts } from '@open-tabletop/character-engine'
import type { Translate } from './i18n'

/** The names a breakdown says: a value's, a condition's, an item's. */
export interface BreakdownNames {
  value: (id: string) => string
  condition: (id: string) => string
  item: (part: { key: string; id: string }) => string
}

const signed = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`)

/**
 * Why a value reads what it does, as sums in words (docs/value-breakdown.md): what makes a
 * value made of others (_Capacity 6 = Might 2 × 2 + 2_, _Load 5 = Rope 2 (×2) + Mail 2_,
 * _Armour 2 = Mail, the highest_), then what its conditions add (_Stealth 3 = 4 − 1
 * Burdened_), and the bound that held it. Empty when nothing makes a difference.
 */
export function breakdownLines(
  id: string,
  parts: ValueParts,
  names: BreakdownNames,
  t: Translate,
): string[] {
  const name = names.value(id)
  const lines: string[] = []
  const made = parts.made
  if (made?.formula !== undefined) {
    const read = new Map(made.parts.map((p) => [p.id, p.amount]))
    const said = made.formula
      .replace(/self\.values\.([\w-]+)/g, (_, v: string) => `${names.value(v)} ${read.get(v) ?? 0}`)
      .replace(/\s*\*\s*/g, ' × ')
      .replace(/\s*\/\s*/g, ' ÷ ')
    lines.push(`${name} ${parts.base} = ${said}`)
  } else if (made) {
    const items = made.parts.flatMap((p) => (p.kind === 'item' ? [p] : []))
    const each = (p: (typeof items)[number]) =>
      `${names.item(p)} ${p.amount}${p.count > 1 && made.how === 'sum' ? ` (×${p.count})` : ''}`
    const said = !items.length
      ? t('breakdown.none')
      : made.how === 'max' || made.how === 'min'
        ? `${names.item(items[0]!)}, ${t(made.how === 'max' ? 'breakdown.highest' : 'breakdown.lowest')}`
        : items.map(each).join(' + ')
    lines.push(`${name} ${parts.base} = ${said}`)
  }
  if (parts.adds.length) {
    const added = parts.adds.map((a) => `${signed(a.amount)} ${names.condition(a.condition)}`)
    const held = parts.held
      ? `, ${t('breakdown.held', { which: t(`breakdown.${parts.held.which}`), at: parts.held.at })}`
      : ''
    lines.push(`${name} ${parts.now} = ${parts.base} ${added.join(' ')}${held}`)
  }
  return lines
}
