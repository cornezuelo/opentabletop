import { describe, expect, it } from 'vitest'
import { findSpans, isStyle, plainText, STYLES, unknownStyles, withoutSpans } from './index'

describe('styled spans', () => {
  it('finds each span with its text and styles', () => {
    const spans = findSpans('Two of hearts [♥]{red}, and [**beware**]{orange underline}.')
    expect(spans.map(({ text, styles }) => ({ text, styles }))).toEqual([
      { text: '♥', styles: ['red'] },
      { text: '**beware**', styles: ['orange', 'underline'] },
    ])
    expect(spans[0].start).toBe(14)
  })

  it('takes a link inside a span and leaves links and variables alone', () => {
    expect(findSpans('[[[The Ford]]]{blue}')[0].text).toBe('[[The Ford]]')
    expect(findSpans('[the web](https://example.org) and {{roll}} and a[b]{{c}}')).toEqual([])
    expect(findSpans('[no style]{}')).toEqual([])
    expect(findSpans('[Upper]{Red}')).toEqual([])
  })

  it('names the styles it does not know', () => {
    expect(unknownStyles('[a]{red} [b]{crimson bold} [c]{crimson}')).toEqual(['crimson', 'bold'])
    expect(unknownStyles('plain')).toEqual([])
    expect(STYLES.every(isStyle)).toBe(true)
  })

  it('reads as plain text without spans or Markdown marks', () => {
    expect(withoutSpans('Ace of [♥]{red} and **more**')).toBe('Ace of ♥ and **more**')
    expect(plainText('[**Yes**]{green}, _and_ `x` ~~no~~ *maybe*')).toBe('Yes, and x no maybe')
    expect(plainText('snake_case_name stays, 2 * 3 * 4 stays')).toBe(
      'snake_case_name stays, 2 * 3 * 4 stays',
    )
  })
})
