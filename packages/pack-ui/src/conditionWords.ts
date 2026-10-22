import { flowText } from './flow'
import { CONDITION_OPS, conditionRows, rowsWords, type ConditionOp } from './conditionRows'
import { translator } from './i18n'

/**
 * A condition in words in the UI's language ("hex.terrain is forest and hex.danger is at
 * least 3"), for a folded card; as YAML when rows can't say it.
 */
export function conditionWords(condition: unknown, locale: string): string {
  const t = translator(() => locale)
  const rows = conditionRows(condition)
  const ops = Object.fromEntries(
    CONDITION_OPS.map((op) => [op, t(`condition.ops.${op}`)]),
  ) as Record<ConditionOp, string>
  return (
    (rows && rowsWords(rows, { ops, and: t('condition.and'), or: t('condition.or') })) ??
    flowText(condition).replace(/^\{\s*|\s*\}$/g, '')
  )
}
