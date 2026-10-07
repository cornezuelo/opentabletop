/**
 * Suggestions while typing `key: value` pairs on one line (conditions, `set`, context):
 * what is being typed at the cursor — a key, or the value of some key — and what fits.
 */

/** Keys a line can use, each with the values it's known to take. */
export type Suggestions = Record<string, readonly string[]>

export interface Typing {
  kind: 'key' | 'value'
  /** For a value, the key it belongs to. */
  key?: string
  /** For a key inside `outer: { … }`, the outer key. */
  parent?: string
  /** What has been typed of the word so far. */
  prefix: string
  /** Where the word starts and ends in the text (it is replaced when a choice is taken). */
  start: number
  end: number
}

const WORD = /[\w.-]/
/** Keys whose value is a comparison of the key around them ({ gte: 3 }, { in: [a, b] }). */
const OPERATORS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])
/** Keys whose value is a condition again. */
const NESTING = new Set(['all', 'any', 'not'])

interface Frame {
  kind: 'map' | 'list'
  /** The key whose values this frame holds (for lists and comparisons). */
  key?: string
  /** In a map: the last key read, while its value is being typed. */
  current?: string
  expectingValue?: boolean
}

/** The word at the cursor and whether it's a key or a value (and of which key). */
export function typingAt(text: string, cursor: number): Typing {
  let start = cursor
  while (start > 0 && WORD.test(text[start - 1])) start--
  let end = cursor
  while (end < text.length && WORD.test(text[end])) end++
  const prefix = text.slice(start, cursor)

  // Read what comes before the word, keeping track of maps, lists and keys.
  const stack: Frame[] = [{ kind: 'map' }]
  const top = () => stack[stack.length - 1]
  /** The key a value typed in a map belongs to (an operator's is the key around it). */
  const owner = (frame: Frame) =>
    frame.current && OPERATORS.has(frame.current) && frame.key ? frame.key : frame.current
  let i = 0
  while (i < start) {
    const c = text[i]
    if (WORD.test(c)) {
      let j = i
      while (j < start && WORD.test(text[j])) j++
      const word = text.slice(i, j)
      const rest = text.slice(j).match(/^\s*:/)
      const frame = top()
      if (rest && frame.kind === 'map' && !frame.expectingValue) {
        frame.current = word
        frame.expectingValue = true
        i = j + rest[0].length
        continue
      }
      i = j
      continue
    }
    const frame = top()
    if (c === '{') {
      const key = frame.kind === 'list' ? frame.key : owner(frame)
      // { gte: 3 } compares the key around it; all / any / not hold conditions again.
      const nested = frame.kind === 'map' && !!frame.current && NESTING.has(frame.current)
      stack.push({ kind: 'map', key: nested ? undefined : key })
    } else if (c === '[') {
      // all / any hold a list of conditions; other lists hold values of their key.
      const nested = frame.kind === 'map' && !!frame.current && NESTING.has(frame.current)
      stack.push({
        kind: 'list',
        key: nested ? undefined : frame.kind === 'list' ? frame.key : owner(frame),
      })
    } else if (c === '}' || c === ']') {
      if (stack.length > 1) stack.pop()
      const parent = top()
      if (parent.kind === 'map') parent.expectingValue = false
    } else if (c === ',') {
      if (frame.kind === 'map') {
        frame.expectingValue = false
        frame.current = undefined
      }
    }
    i++
  }
  const frame = top()
  if (frame.kind === 'list') return { kind: 'value', key: frame.key, prefix, start, end }
  if (frame.expectingValue) return { kind: 'value', key: owner(frame), prefix, start, end }
  return { kind: 'key', ...(frame.key && { parent: frame.key }), prefix, start, end }
}

/** In a comma-separated list of values (lake, sea), the value at the cursor. */
export function typingInList(text: string, cursor: number): Typing {
  const t = typingAt(text, cursor)
  return { kind: 'value', key: '', prefix: t.prefix, start: t.start, end: t.end }
}

/** Choices for what is being typed, best first (starts with the prefix, then contains it). */
export function choicesFor(typing: Typing, suggestions: Suggestions, limit = 12): string[] {
  const pool =
    typing.kind === 'value'
      ? [...(suggestions[typing.key ?? ''] ?? [])]
      : typing.parent
        ? nestedKeys(typing.parent, suggestions)
        : Object.keys(suggestions)
  const prefix = typing.prefix.toLowerCase()
  const starts = pool.filter((c) => c.toLowerCase().startsWith(prefix))
  const contains = pool.filter((c) => !starts.includes(c) && c.toLowerCase().includes(prefix))
  return [...new Set([...starts.sort(), ...contains.sort()])]
    .filter((c) => c !== typing.prefix)
    .slice(0, limit)
}

/**
 * Keys inside `parent: { … }`: the next part of dotted keys (resources.food → food), or,
 * when there are none, the comparisons a condition can make (gte: 3).
 */
function nestedKeys(parent: string, suggestions: Suggestions): string[] {
  const inside = Object.keys(suggestions)
    .filter((k) => k.startsWith(`${parent}.`))
    .map((k) => k.slice(parent.length + 1).split('.')[0])
  return inside.length ? [...new Set(inside)] : [...OPERATORS]
}

/** The text with a choice put in place of the word being typed; keys get their ": ". */
export function applyChoice(
  text: string,
  typing: Typing,
  choice: string,
): { text: string; cursor: number } {
  const after = text.slice(typing.end)
  const insert = typing.kind === 'key' && !/^\s*:/.test(after) ? `${choice}: ` : choice
  const next = text.slice(0, typing.start) + insert + after
  return { text: next, cursor: typing.start + insert.length }
}
