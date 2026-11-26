import { describe, expect, it } from 'vitest'
import { newPage, type NotePage } from '@open-tabletop/notes'
import { emptyRoster } from '@open-tabletop/session'
import { emptyGameIndex, gameUrl, linkFromUrl, linkedThing, type GameIndex } from './game'
import { pageThings } from './pageLinks'
import { headingAnchor, renderPage } from './render'
import { linkResolver } from './resolve'
import { notePageUrl, noteRefUrl } from './address'
import { translator } from './i18n'
import { linkOptions, suggestTexts } from './suggest'
import { en } from './i18n/en'

const page = (id: string, path: string, body = '', campaign?: string): NotePage =>
  newPage(id, path, campaign, '2026-11-26T10:00:00.000Z', body)

const index: GameIndex = {
  campaigns: { vale: 'The Vale' },
  things: [
    { kind: 'campaign', link: 'campaign:vale', name: 'The Vale', campaign: 'vale' },
    {
      kind: 'faction',
      link: 'faction:vale/clans',
      name: 'Iron Clans',
      where: 'The Vale',
      campaign: 'vale',
      noteRef: 'Iron Clans',
    },
    { kind: 'character', link: 'character:kael', name: 'Kael', noteRef: 'npcs/Kael' },
    { kind: 'map', link: 'map:a1b2', name: 'Greywood', campaign: 'vale' },
    {
      kind: 'map',
      link: 'map:a1b2#0608',
      name: 'The ford (0608)',
      where: 'Greywood',
      campaign: 'vale',
    },
    {
      kind: 'map',
      link: 'map:a1b2#0303',
      name: 'Old shrine',
      where: 'Greywood',
      campaign: 'vale',
      noteRef: 'Iron Clans',
      only: 'noteRef',
    },
  ],
}

const pages = [
  page(
    'clans',
    'Iron Clans',
    'Led by [[character:kael]] from [[map:a1b2#0608]].\n## Secrets',
    'vale',
  ),
  page('kael', 'npcs/Kael', 'See [[Iron Clans#Secrets]] and [[Nobody yet]].'),
]

describe('a page read', () => {
  it('draws page links, new pages and links into the games by their names now', () => {
    const html = renderPage(pages[0].body, linkResolver(pages, index, pages[0]))
    expect(html).toContain('class="game-link"')
    expect(html).toContain('Kael</a>')
    expect(html).toContain('The ford (0608)</a>')
    expect(html).toContain('<h2 id="h-secrets">Secrets</h2>')
    const kael = renderPage(pages[1].body, linkResolver(pages, index, pages[1]))
    // General's page doesn't reach the Vale's: the link would make a new one.
    expect(kael).toContain('data-new="Iron Clans"')
    expect(kael).toContain('data-new="Nobody yet"')
  })

  it('keeps what is written as text, and code as code', () => {
    const html = renderPage(
      '<script>x</script>\n\nSee `[[Iron Clans]]` <b>now</b>',
      linkResolver(pages, index, {}),
    )
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('<code>[[Iron Clans]]</code>')
  })

  it('reaches a page from its campaign, its heading too', () => {
    const view = linkResolver(pages, index, { campaign: 'vale' })({
      kind: 'page',
      target: 'iron clans',
      heading: 'Secrets',
    })
    expect(view).toEqual({
      kind: 'page',
      id: 'clans',
      text: 'Iron Clans › Secrets',
      heading: 'Secrets',
    })
    expect(headingAnchor('Los Señores del Vado')).toBe('h-los-senores-del-vado')
  })

  it('shows a thing gone as missing', () => {
    const view = linkResolver(pages, emptyGameIndex(), {})({ kind: 'character', target: 'zed' })
    expect(view).toMatchObject({ kind: 'game', text: 'zed', missing: true })
  })
})

describe('links into the games', () => {
  it('open each in its app, and come back from their addresses', () => {
    for (const inner of [
      'character:kael',
      'campaign:vale',
      'faction:vale/clans',
      'map:a1b2#0608',
      'map:a1b2',
    ]) {
      const [kind, rest] = [inner.split(':')[0], inner.slice(inner.indexOf(':') + 1)]
      const [target, heading] = rest.split('#')
      const url = gameUrl({ kind: kind as 'map', target, ...(heading ? { heading } : {}) })!
      expect(linkFromUrl(`https://example.org/site/${url.replace(/^\.\.\//, '')}`)).toBe(inner)
    }
    expect(linkFromUrl('https://example.org/blog/#/x')).toBeNull()
  })

  it('reaches a cell not named by its map', () => {
    expect(
      linkedThing(index, { kind: 'map', target: 'a1b2', heading: '0101', from: 0, to: 0 })?.name,
    ).toBe('0101 (Greywood)')
  })

  it('lists what a page names and what points at it', () => {
    const things = pageThings(pages, index, pages[0])
    expect(things.map((t) => [t.thing.name, t.named, t.linksHere])).toEqual([
      ['Kael', true, false],
      ['The ford (0608)', true, false],
      ['Iron Clans', false, true],
      ['Old shrine', false, true],
    ])
  })

  it('reads an empty browser', () => {
    expect(emptyRoster().characters).toEqual([])
  })
})

describe('suggestions while writing a link', () => {
  const texts = { kinds: en.kinds, general: en.general }

  it('offers the pages a page reaches and the games’ things of its campaign', () => {
    const found = linkOptions('Talk to [[Ka', pages, index, 'vale', texts)!
    expect(found.typed).toBe('Ka')
    expect(found.options.map((o) => o.insert)).toEqual([
      'Iron Clans',
      'Kael',
      'campaign:vale',
      'faction:vale/clans',
      'character:kael',
      'map:a1b2',
      'map:a1b2#0608',
    ])
    expect(found.options[1].detail).toBe('General / npcs')
    expect(linkOptions('no link here', pages, index, 'vale', texts)).toBeNull()
    expect(linkOptions('[[done]] then', pages, index, 'vale', texts)).toBeNull()
  })

  it("offers a page's headings after #", () => {
    const found = linkOptions('[[Iron Clans#S', pages, index, 'vale', texts)!
    expect(found.options.map((o) => o.insert)).toEqual(['Iron Clans#Secrets'])
  })
})

describe("a campaign's Log's notes, read as Notes does", () => {
  const pages = [page('p1', 'npcs/Old Tobin', '', 'vale'), page('p2', 'Old Tobin', '')]

  it('reach the pages of their campaign first, and name the games’ things', () => {
    const html = renderPage(
      'Met [[Old Tobin]] at [[map:a1b2#0608]]; [[Ferry tales]] to write.',
      linkResolver(pages, index, { campaign: 'vale' }),
    )
    expect(html).toContain('data-page="p1"')
    expect(html).not.toContain('data-page="p2"')
    expect(html).toContain('data-new="Ferry tales"')
    expect(html).toContain('class="game-link"')
  })

  it('open Notes at the page, or at the one to make in the campaign', () => {
    expect(notePageUrl('p 1')).toBe('../notes/#/page/p%201')
    expect(noteRefUrl('Ferry tales', 'vale')).toBe('../notes/#/ref/Ferry%20tales?in=vale')
  })

  it('suggest links in the UI’s language', () => {
    expect(suggestTexts(translator(() => 'es')).kinds.character).toBe('Personaje')
    expect(suggestTexts(translator(() => 'en')).general).toBe(en.general)
  })
})
