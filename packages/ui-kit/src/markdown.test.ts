import { describe, expect, it } from 'vitest'
import { helpMarkdown, markdownText, renderMarkdown } from './markdown'

describe('pack texts in Markdown', () => {
  it('format paragraphs, bold, code and lists', () => {
    expect(renderMarkdown('One.\n\n**Shows:** `d66` dice\n\n- a\n- b')).toBe(
      '<p>One.</p>\n<p><strong>Shows:</strong> <code>d66</code> dice</p>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n',
    )
  })

  it('keep templates and conditions as they are', () => {
    expect(renderMarkdown('`{{charisma}}` and danger: { gte: 2 }')).toBe(
      '<p><code>{{charisma}}</code> and danger: { gte: 2 }</p>\n',
    )
  })

  it('never let a pack add HTML, scripts or other links than the web', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\nA <img src=x onerror=alert(1)> ![pic](https://x.org/a.png)\n\n[x](javascript:alert(1)) [y](https://example.org)\n\n# Title',
    )
    expect(html).not.toMatch(/<script|<img|href="javascript/)
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain(
      '<a href="https://example.org" target="_blank" rel="noopener noreferrer">y</a>',
    )
    expect(html).toContain('<p><strong>Title</strong></p>')
  })

  it('read as plain text for labels', () => {
    expect(markdownText('One **two**.\n\n**Shows:** `x` & y')).toBe('One two.\nShows: x & y')
  })
})

describe('help texts', () => {
  it('keep one line per paragraph and "• " lines as a list, with Markdown inside', () => {
    const text = 'What it does.\n• `time: 180` — three hours\n• `speed: 0.5` — half speed\nAfter.'
    expect(helpMarkdown(text)).toBe(
      'What it does.\n\n- `time: 180` — three hours\n- `speed: 0.5` — half speed\n\nAfter.',
    )
    expect(renderMarkdown(helpMarkdown(text))).toBe(
      '<p>What it does.</p>\n<ul>\n<li><code>time: 180</code> — three hours</li>\n<li><code>speed: 0.5</code> — half speed</li>\n</ul>\n<p>After.</p>\n',
    )
  })

  it('a plain text stays a paragraph', () => {
    expect(helpMarkdown('Only this.')).toBe('Only this.')
  })
})
