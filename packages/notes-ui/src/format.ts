import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'

/**
 * What the writing bar does to the text (notes-ui's `NoteEditor`), as changes of the editor's
 * state: marks around the selection, a line made a heading, a list or a quote, a table, a link.
 * Each takes the format off when the text has it already.
 */

/** The inline formats and their marks. */
export const MARKS = { bold: '**', italic: '_', strike: '~~' } as const
export type InlineFormat = keyof typeof MARKS

/**
 * Marks around each selection (`**bold**`), or the cursor left between them when nothing is
 * selected; taken off when they're there already, inside or around the selection.
 */
export function toggleMarks(state: EditorState, format: InlineFormat): TransactionSpec {
  const mark = MARKS[format]
  const n = mark.length
  return state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to)
    const before = state.sliceDoc(range.from - n, range.from)
    const after = state.sliceDoc(range.to, range.to + n)
    if (before === mark && after === mark)
      return {
        changes: [
          { from: range.from - n, to: range.from },
          { from: range.to, to: range.to + n },
        ],
        range: EditorSelection.range(range.from - n, range.to - n),
      }
    if (text.length >= 2 * n && text.startsWith(mark) && text.endsWith(mark))
      return {
        changes: { from: range.from, to: range.to, insert: text.slice(n, -n) },
        range: EditorSelection.range(range.from, range.to - 2 * n),
      }
    return {
      changes: [
        { from: range.from, insert: mark },
        { from: range.to, insert: mark },
      ],
      range: EditorSelection.range(range.from + n, range.to + n),
    }
  })
}

/** The lines the selections touch, once each, top to bottom. */
function selectedLines(state: EditorState) {
  const lines = new Map<number, { from: number; text: string }>()
  for (const range of state.selection.ranges)
    for (let at = range.from; ;) {
      const line = state.doc.lineAt(at)
      lines.set(line.number, { from: line.from, text: line.text })
      if (line.to >= range.to) break
      at = line.to + 1
    }
  return [...lines.entries()].sort(([a], [b]) => a - b).map(([, line]) => line)
}

const HEADING = /^(#{1,6})\s+/

/** The heading level of the cursor's line (0: normal text). */
export function headingLevel(state: EditorState): number {
  const line = state.doc.lineAt(state.selection.main.head)
  return HEADING.exec(line.text)?.[1].length ?? 0
}

/**
 * The selected lines made headings of `level` (1 a page's title, 2 a section, 3 a subsection),
 * or normal text (0, or the level they have already).
 */
export function setHeading(state: EditorState, level: number): TransactionSpec {
  const lines = selectedLines(state)
  const off = level === 0 || lines.every((l) => HEADING.exec(l.text)?.[1].length === level)
  return {
    changes: lines.map((line) => {
      const had = HEADING.exec(line.text)?.[0].length ?? 0
      return { from: line.from, to: line.from + had, insert: off ? '' : `${'#'.repeat(level)} ` }
    }),
  }
}

/** The kinds of line a block format makes. */
export type LineFormat = 'list' | 'numbered' | 'quote'

const PREFIXES: Record<LineFormat, RegExp> = {
  list: /^\s*[-*+]\s+(\[[ xX]\]\s+)?/,
  numbered: /^\s*\d+[.)]\s+/,
  quote: /^\s*>\s?/,
}
const LIST = /^\s*([-*+]|\d+[.)])\s+/

/**
 * The selected lines made a list, a numbered list or a quote; back to plain lines when they're
 * all that already. A list made of a numbered one (or the other way round) changes its marks.
 */
export function toggleLines(state: EditorState, format: LineFormat): TransactionSpec {
  const lines = selectedLines(state).filter((l, _, all) => all.length === 1 || l.text.trim())
  const prefix = PREFIXES[format]
  const off = lines.every((l) => prefix.test(l.text))
  return {
    changes: lines.map((line, i) => {
      const had = (off ? prefix : format === 'quote' ? /^/ : LIST).exec(line.text)?.[0].length ?? 0
      const insert = off
        ? ''
        : format === 'list'
          ? '- '
          : format === 'numbered'
            ? `${i + 1}. `
            : '> '
      return { from: line.from, to: line.from + had, insert }
    }),
  }
}

/**
 * `text` put on a paragraph of its own at `at` (the cursor: absent), the cursor `cursor`
 * characters into it (after it: absent).
 */
export function insertBlock(
  state: EditorState,
  text: string,
  cursor = text.length,
  at?: number,
): TransactionSpec {
  const pos = at ?? state.selection.main.head
  const line = state.doc.lineAt(pos)
  const before = line.text.slice(0, pos - line.from).trim() ? '\n\n' : ''
  const after = line.text.slice(pos - line.from).trim() ? '\n\n' : ''
  const insert = `${before}${text}${after}`
  return {
    changes: { from: pos, to: pos, insert },
    selection: { anchor: pos + before.length + cursor },
    scrollIntoView: true,
  }
}

/** A table of two columns and one row, named `head`, its first cell's name selected. */
export function insertTable(state: EditorState, head: [string, string]): TransactionSpec {
  const [a, b] = head
  const table = `| ${a} | ${b} |\n| --- | --- |\n|  |  |`
  const spec = insertBlock(state, table, 2)
  const anchor = (spec.selection as { anchor: number }).anchor
  return { ...spec, selection: { anchor, head: anchor + a.length } }
}

/**
 * A link to a page or the games begun: the selection becomes its text (`[[|text]]`), the
 * cursor after `[[` for the suggestions to fill.
 */
export function startPageLink(state: EditorState): TransactionSpec {
  const range = state.selection.main
  const text = state
    .sliceDoc(range.from, range.to)
    .replace(/[[\]|\n]/g, ' ')
    .trim()
  const insert = text ? `[[|${text}]]` : '[[]]'
  return {
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + 2 },
    scrollIntoView: true,
  }
}

/**
 * A link to a website: the selection as its text (else `text`), its address selected to type
 * (`[text](https://)`).
 */
export function insertWebLink(state: EditorState, text: string): TransactionSpec {
  const range = state.selection.main
  const shown =
    state
      .sliceDoc(range.from, range.to)
      .replace(/[[\]\n]/g, ' ')
      .trim() || text
  const insert = `[${shown}](https://)`
  const at = range.from + shown.length + 3
  return {
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: at, head: at + 'https://'.length },
    scrollIntoView: true,
  }
}
