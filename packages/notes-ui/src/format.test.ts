import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  headingLevel,
  insertTable,
  insertWebLink,
  setHeading,
  startPageLink,
  toggleLines,
  toggleMarks,
} from './format'

/** A text with `[` `]` marking the selection (or `|` the cursor). */
function state(marked: string): EditorState {
  const cursor = marked.indexOf('|')
  if (cursor >= 0)
    return EditorState.create({
      doc: marked.replace('|', ''),
      selection: EditorSelection.cursor(cursor),
    })
  const from = marked.indexOf('[')
  const to = marked.indexOf(']') - 1
  return EditorState.create({
    doc: marked.replace('[', '').replace(']', ''),
    selection: EditorSelection.range(from, to),
  })
}

/** The text after a change, with its selection marked as `state` reads it. */
function after(start: EditorState, spec: ReturnType<typeof toggleMarks>): string {
  const next = start.update(spec).state
  const { from, to } = next.selection.main
  const doc = next.doc.toString()
  return from === to
    ? `${doc.slice(0, from)}|${doc.slice(from)}`
    : `${doc.slice(0, from)}[${doc.slice(from, to)}]${doc.slice(to)}`
}

describe('the writing bar', () => {
  it('puts marks around the selection, or the cursor between them, and takes them off', () => {
    expect(after(state('an [old] mill'), toggleMarks(state('an [old] mill'), 'bold'))).toBe(
      'an **[old]** mill',
    )
    const bold = state('an **[old]** mill')
    expect(after(bold, toggleMarks(bold, 'bold'))).toBe('an [old] mill')
    const whole = state('an [**old**] mill')
    expect(after(whole, toggleMarks(whole, 'bold'))).toBe('an [old] mill')
    const empty = state('an | mill')
    expect(after(empty, toggleMarks(empty, 'italic'))).toBe('an _|_ mill')
    const struck = state('[gone]')
    expect(after(struck, toggleMarks(struck, 'strike'))).toBe('~~[gone]~~')
  })

  it('makes lines headings of a level, and normal text again', () => {
    const line = state('Old To|bin\nThe ferryman')
    expect(headingLevel(line)).toBe(0)
    expect(after(line, setHeading(line, 2))).toBe('## Old To|bin\nThe ferryman')
    const section = state('## Old To|bin')
    expect(headingLevel(section)).toBe(2)
    expect(after(section, setHeading(section, 1))).toBe('# Old To|bin')
    expect(after(section, setHeading(section, 2))).toBe('Old To|bin')
    expect(after(section, setHeading(section, 0))).toBe('Old To|bin')
  })

  it('makes lines a list, a numbered list or a quote, and plain again', () => {
    const lines = state('[one\ntwo]')
    expect(after(lines, toggleLines(lines, 'list'))).toBe('- [one\n- two]')
    const list = state('[- one\n- two]')
    expect(after(list, toggleLines(list, 'numbered'))).toBe('[1. one\n2. two]')
    expect(after(list, toggleLines(list, 'list'))).toBe('[one\ntwo]')
    const quote = state('he sa|id')
    expect(after(quote, toggleLines(quote, 'quote'))).toBe('> he sa|id')
    const quoted = state('> he sa|id')
    expect(after(quoted, toggleLines(quoted, 'quote'))).toBe('he sa|id')
  })

  it('writes a table on a paragraph of its own, and begins links', () => {
    const text = state('Debts|')
    expect(after(text, insertTable(text, ['Name', 'Owes']))).toBe(
      'Debts\n\n| [Name] | Owes |\n| --- | --- |\n|  |  |',
    )
    const word = state('ask [the ferryman]')
    const link = word.update(startPageLink(word)).state
    expect(link.doc.toString()).toBe('ask [[|the ferryman]]')
    expect(link.selection.main.head).toBe('ask [['.length)
    const web = word.update(insertWebLink(word, 'text')).state
    expect(web.doc.toString()).toBe('ask [the ferryman](https://)')
    expect(web.sliceDoc(web.selection.main.from, web.selection.main.to)).toBe('https://')
    const nothing = state('see |')
    expect(nothing.update(startPageLink(nothing)).state.doc.toString()).toBe('see [[]]')
    expect(nothing.update(insertWebLink(nothing, 'text')).state.doc.toString()).toBe(
      'see [text](https://)',
    )
  })
})
