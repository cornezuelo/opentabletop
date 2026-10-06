import { describe, expect, it } from 'vitest'
import { manual } from './manual'
import { createManual, parsePage } from './pages'
import { pageLink } from './render'

describe('manual pages', () => {
  it('parse title, order and sections', () => {
    const page = parsePage(
      'docs/manual/en/hexmapper/02-terrain.md',
      '# Terrain\n\nIntro text.\n\n## Painting\n\nUse the **brush**.\n\n## The palette\n\nColors.',
    )!
    expect(page).toMatchObject({ app: 'hexmapper', locale: 'en', slug: 'terrain', order: 2 })
    expect(page.title).toBe('Terrain')
    expect(page.sections.map((s) => [s.id, s.text])).toEqual([
      ['', 'Intro text.'],
      ['painting', 'Use the brush.'],
      ['the-palette', 'Colors.'],
    ])
  })

  it('fall back to English pages and search every word', () => {
    const m = createManual({
      'x/en/app/01-a.md': '# Alpha\n\n## Roads\n\nDraw roads and rivers.',
      'x/en/app/02-b.md': '# Beta\n\nNothing here.',
      'x/es/app/01-a.md': '# Alfa\n\n## Caminos\n\nDibuja caminos y ríos.',
    })
    expect(m.pages('app', 'es').map((p) => p.title)).toEqual(['Alfa', 'Beta'])
    expect(m.search('rios caminos', 'es')[0]).toMatchObject({ section: { id: 'caminos' } })
    expect(m.search('roads zebra', 'en')).toEqual([])
  })
})

describe('the bundled manual', () => {
  it('has a Spanish page for every English one', () => {
    for (const app of manual.apps) {
      const en = manual.pages(app, 'en').map((p) => p.slug)
      const es = manual
        .pages(app, 'es')
        .filter((p) => p.locale === 'es')
        .map((p) => p.slug)
      expect(es, app).toEqual(en)
    }
  })

  it('only links to pages and sections that exist', () => {
    for (const locale of ['en', 'es'])
      for (const app of manual.apps)
        for (const page of manual.pages(app, locale))
          for (const [, href] of page.body.matchAll(/\]\(([^)]+\.md(?:#[\w-]+)?)\)/g)) {
            const link = pageLink(href)
            const target = link && manual.page(link.app ?? app, link.slug, locale)
            expect(target, `${locale}/${app}/${page.slug} → ${href}`).toBeTruthy()
            if (link?.anchor)
              expect(
                target!.sections.some((s) => s.id === link.anchor),
                href,
              ).toBe(true)
          }
  })
})

describe('search text', () => {
  it('drops HTML tags and list markers', () => {
    const page = parsePage(
      'x/en/app/01-a.md',
      '# A\n\n- Press <kbd>K</kbd> to place\n1. then drag',
    )!
    expect(page.sections[0].text).toBe('Press K to place then drag')
  })
})
