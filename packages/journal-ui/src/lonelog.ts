import { timelineText } from '@open-tabletop/campaign-ui'
import type { AgainstOutcome, DiceResult } from '@open-tabletop/dice'
import type { LogLine, ToldDie } from '@open-tabletop/journal'
import type { HistoryItem } from '@open-tabletop/oracle-engine'
import type { JournalEntry, JournalLevel, RolledNode } from '@open-tabletop/session'
import { againstVerdict } from '@open-tabletop/ui-kit'
import { translator } from './i18n'
import { momentAt, type LogWords, type ShownSession } from './log'

/**
 * The campaign's log in Lonelog (https://lonelog.org/, docs/notes-and-journal.md §2), the
 * notation solo players write their logs in: sessions as `##` headings, each day a scene
 * (`### S1 *15 Thaw*`), its lines in a code block, `@` an action taken, `d:` a roll against
 * a number (its verdict), `tbl:` a table's result (content), `->` what it gave, `=>` what
 * happened because of it, `(note: …)` the rules behind, `[Clock:Name 3/6]` a progress clock;
 * the player's notes as prose between the blocks.
 */

/** A die's roll in Lonelog (`2d6=7`). */
const rollText = (r: Pick<DiceResult, 'expression' | 'total'>): string =>
  `${r.expression.replace(/\s+/g, '')}=${r.total}`

/** A number to beat in Lonelog (`≤ 3`, `≥ 4`). */
const OPS: Record<AgainstOutcome['op'], string> = { lte: '≤', lt: '<', gte: '≥', gt: '>' }

/** A text on one line, without what would close a tag or a block. */
const flat = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim()
const tagName = (text: string) => flat(text).replace(/[|[\]]/g, ' ')

/**
 * A roll's line: `d:` when it was rolled against a number (a verdict, its result after it as
 * a consequence), else `tbl:` (what it gave is the content); the dice rolled inside its
 * result (a row’s harm) in parentheses after it.
 */
function rollLines(
  label: string,
  result: string,
  dice: readonly ToldDie[],
  against: AgainstOutcome | undefined,
  locale: string,
): string[] {
  const own = dice.filter((d) => !d.inside).map(rollText)
  const inside = dice.filter((d) => d.inside).map(rollText)
  const rolled = [label, own.join(',')].filter(Boolean).join(' ')
  const after = inside.length ? ` (${inside.join(', ')})` : ''
  if (against)
    return [
      `d: ${rolled} ${OPS[against.op]} ${against.target} -> ${againstVerdict(against.success, locale)}`,
      ...(result ? [`=> ${result}${after}`] : []),
    ]
  return [`tbl: ${rolled} -> ${result || '—'}${after}`]
}

/** What a result's roll was rolled against: the roll's line before it, for the same check. */
function againstOf(
  entries: readonly JournalEntry[],
  result: JournalEntry,
): AgainstOutcome | undefined {
  const rolled = entries
    .slice(0, entries.indexOf(result))
    .findLast((e) => e.code === 'ROLLED' && e.data?.check === result.data?.event)
  const nodes = Array.isArray(rolled?.data?.rolls) ? (rolled.data.rolls as RolledNode[]) : []
  return nodes.find((n) => n.depth === 0)?.against
}

/** Codes a moment's title is an action by: one taken, a fight's round and turn. */
const ACTED = new Set(['ACTION_TAKEN', 'ENCOUNTER_ROUND', 'ENCOUNTER_TURN'])

/** A moment in Lonelog: the action it was (`@`), its rolls, what they gave and what it changed. */
function momentLines(
  line: Extract<LogLine, { kind: 'moment' }>,
  locale: string,
  level: JournalLevel,
): string[] {
  const told = momentAt(line, locale, level)
  const entries = line.moment.entries
  const byId = new Map(entries.map((e) => [e.id, e]))
  const out: string[] = []
  const acted = entries.some((e) => ACTED.has(e.code))
  // A moment named by a roll the player gave says it in its result's line.
  const rolledFirst = !acted && told.lines.some((l) => byId.get(l.id)?.code === 'ORACLE_RESULT')
  if (acted) out.push(`@ ${flat(told.title)}`)
  else if (!rolledFirst || !told.lines.length) out.push(`=> ${flat(told.title)}`)
  for (const l of told.lines) {
    const e = byId.get(l.id)
    const text = flat(l.text)
    if (e?.code === 'ORACLE_RESULT') {
      // Its line reads "What was rolled: what it gave".
      const result = flat(e.text ?? '')
      const label =
        result && text.endsWith(`: ${result}`) ? text.slice(0, -result.length - 2) : text
      out.push(...rollLines(label, result, l.dice ?? [], againstOf(entries, e), locale))
    } else if (l.level === 'detail' && !l.notable && e?.code !== 'CHANGED')
      out.push(`(note: ${text})`)
    else out.push(`=> ${text}`)
  }
  for (const change of told.changes) out.push(`=> ${flat(change)}`)
  if (told.why.length) out.push(`(note: ${told.why.map(flat).join('; ')})`)
  return out
}

/** A hand roll in the Oracle in Lonelog: what was rolled, its dice and what it gave. */
function oracleLines(roll: HistoryItem, words: LogWords): string[] {
  const r = roll.resolution
  return rollLines(
    tagName(words.nameOf(roll.source)),
    flat(r.text ?? ''),
    r.rolls,
    r.against,
    words.locale,
  )
}

/** The world's line in Lonelog: a progress clock as one (`[Clock:Name 3/6]`), else what came. */
function worldLines(line: Extract<LogLine, { kind: 'world' }>, words: LogWords): string[] {
  const { entry } = line
  const d = entry.data ?? {}
  if (entry.code === 'CLOCK' && typeof d.filled === 'number' && typeof d.segments === 'number')
    return [`[Clock:${tagName(entry.text ?? String(d.clock))} ${d.filled}/${d.segments}]`]
  return [`=> ${flat(timelineText(entry, words.calendar, words.locale))}`]
}

/**
 * The log as shown, in Lonelog, oldest first: the campaign's name as its front matter and
 * title, each session a heading with the real date it was played on, each day a scene.
 */
export function logLonelog(
  shown: readonly ShownSession[],
  title: string,
  words: LogWords,
  level: JournalLevel,
): string {
  const t = translator(() => words.locale)
  const out = ['---', `title: ${JSON.stringify(title)}`, '---', '', `# ${title}`]
  let scene = 0
  for (const session of [...shown].reverse()) {
    out.push(
      '',
      `## ${session.session ? t('log.session', { n: session.number ?? 0 }) : t('log.outside')}`,
    )
    if (session.session) out.push(`*${t('log.lonelogDate')}: ${session.session.at.slice(0, 10)}*`)
    for (const day of [...session.days].reverse()) {
      out.push('', `### S${++scene} *${day.text}*`)
      // The notation in code blocks, the player's notes as prose between them.
      let block: string[] = []
      const close = () => {
        if (block.length) out.push('', '```', ...block, '```')
        block = []
      }
      for (const line of [...day.lines].reverse()) {
        if (line.kind === 'note') {
          close()
          out.push('', line.note.text.trim())
        } else if (line.kind === 'moment') block.push(...momentLines(line, words.locale, level))
        else if (line.kind === 'world') block.push(...worldLines(line, words))
        else block.push(...oracleLines(line.roll, words))
      }
      close()
    }
  }
  return `${out.join('\n')}\n`
}
