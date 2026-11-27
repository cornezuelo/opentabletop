import { describe, expect, it } from 'vitest'
import { markdownSummary, welcomePage } from './welcome'

describe('the welcome page', () => {
  it('is in the language asked for, with the manual’s summary of Markdown', () => {
    const en = welcomePage('en')
    expect(en.title).toBe('Welcome to Notes')
    expect(en.body).toContain('| `**bold**`')
    expect(en.body).not.toContain('<!--')
    const es = welcomePage('es')
    expect(es.title).toBe('Bienvenida a Notas')
    expect(es.body).toContain('| `**negrita**`')
    // Another language: English.
    expect(welcomePage('fr').title).toBe('Welcome to Notes')
  })

  it('drops the manual’s own links from the summary', () => {
    const manual =
      'a\n<!-- markdown-summary -->\nsee [Links](#links) or [x](../a.md), [web](https://x)\n<!-- /markdown-summary -->'
    expect(markdownSummary(manual)).toBe('see Links or x, [web](https://x)')
  })
})
