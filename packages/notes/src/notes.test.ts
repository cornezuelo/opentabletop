import { describe, expect, it } from 'vitest'
import {
  backlinks,
  cleanNotePath,
  filesToPages,
  findPage,
  formatLink,
  gameLinks,
  linkMentions,
  mergePages,
  newPage,
  pageHeadings,
  pageJson,
  pagesToFiles,
  pictureMarkdown,
  picturesIn,
  picturesOfFiles,
  pageTitle,
  pageTree,
  parseLinks,
  pathTaken,
  readPageJson,
  renamePage,
  searchPages,
  unlinkedMentions,
  type NotePage,
} from './index'

const NOW = '2026-11-26T10:00:00.000Z'
const LATER = '2026-11-26T11:00:00.000Z'

function page(id: string, path: string, body = '', campaign?: string): NotePage {
  return newPage(id, path, campaign, NOW, body)
}

describe('pages', () => {
  it('cleans paths copied from other notes apps', () => {
    expect(cleanNotePath(' /npcs// Old Tobin .md')).toBe('npcs/Old Tobin')
    expect(pageTitle(page('a', 'places/towns/Hollow Gate'))).toBe('Hollow Gate')
  })

  it('stores and reads a page, refusing newer formats', () => {
    const p = page('a', 'npcs/Old Tobin', 'The ferryman.', 'vale')
    expect(readPageJson(pageJson(p))).toEqual(p)
    expect(readPageJson(JSON.stringify({ ...p, format: 99 }))).toBeNull()
    expect(readPageJson('nope')).toBeNull()
  })
})

describe('links', () => {
  it('reads links to pages, headings, texts and into the games', () => {
    const text =
      'See [[Old Tobin]], [[npcs/Mira|the Red]] and [[Hollow Gate#Secrets]]; ' +
      '[[character:kael]], [[map:a1b2#0608|the ford]], [[faction:vale/iron-clans]].'
    expect(
      parseLinks(text).map((l) => {
        const { kind, target, heading, alias } = l
        return { kind, target, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
      }),
    ).toEqual([
      { kind: 'page', target: 'Old Tobin' },
      { kind: 'page', target: 'npcs/Mira', alias: 'the Red' },
      { kind: 'page', target: 'Hollow Gate', heading: 'Secrets' },
      { kind: 'character', target: 'kael' },
      { kind: 'map', target: 'a1b2', heading: '0608', alias: 'the ford' },
      { kind: 'faction', target: 'vale/iron-clans' },
    ])
    expect(gameLinks(text)).toHaveLength(3)
  })

  it('leaves code alone and reads an unknown kind as a page', () => {
    const text = '`[[Not a link]]`\n```\n[[Nor this]]\n```\n[[note: a page]] [[]]'
    expect(parseLinks(text).map((l) => l.target)).toEqual(['note: a page'])
  })

  it('writes a link back as it was', () => {
    for (const written of ['[[Old Tobin]]', '[[map:a1b2#0608|the ford]]', '[[A#B|c]]'])
      expect(formatLink(parseLinks(written)[0])).toBe(written)
  })
})

describe('what a link reaches', () => {
  const pages = [
    page('tobin-vale', 'npcs/Old Tobin', '', 'vale'),
    page('tobin-general', 'Old Tobin'),
    page('gate', 'places/Hollow Gate'),
    page('other', 'npcs/Old Tobin', '', 'moor'),
  ]

  it("looks in the page's campaign first, then General", () => {
    expect(findPage(pages, 'old tobin', 'vale')?.id).toBe('tobin-vale')
    expect(findPage(pages, 'Old Tobin', undefined)?.id).toBe('tobin-general')
    expect(findPage(pages, 'Hollow Gate', 'vale')?.id).toBe('gate')
    expect(findPage(pages, 'places/hollow gate.md', 'moor')?.id).toBe('gate')
    // Another campaign's pages are out of reach.
    expect(findPage(pages, 'npcs/Old Tobin', undefined)).toBeUndefined()
  })

  it('knows a path taken in its own campaign only', () => {
    expect(pathTaken(pages, 'NPCs/old tobin', 'vale')).toBe(true)
    expect(pathTaken(pages, 'npcs/Old Tobin', 'vale', 'tobin-vale')).toBe(false)
    expect(pathTaken(pages, 'npcs/Old Tobin', undefined)).toBe(false)
  })
})

describe('backlinks and mentions', () => {
  const tobin = page('tobin', 'npcs/Old Tobin', 'Ferryman.', 'vale')
  const pages = [
    tobin,
    page('gate', 'Hollow Gate', 'Ruled by nobody.\n[[Old Tobin]] keeps the ford.', 'vale'),
    page('mira', 'Mira', 'Owes old tobin a favour. `Old Tobin` in code.', 'vale'),
    page('moor', 'Moor', 'Old Tobin of the moor.', 'moor'),
  ]

  it('lists the pages that link to a page, with their lines', () => {
    expect(backlinks(pages, tobin)).toEqual([
      { page: pages[1], lines: ['[[Old Tobin]] keeps the ford.'] },
    ])
  })

  it('lists where its title is written without a link, in its campaign', () => {
    expect(unlinkedMentions(pages, tobin).map((m) => m.page.id)).toEqual(['mira'])
  })

  it('links the mentions', () => {
    expect(linkMentions('Owes old tobin a favour; Old Tobin knows.', 'Old Tobin')).toBe(
      'Owes [[Old Tobin|old tobin]] a favour; [[Old Tobin]] knows.',
    )
  })
})

describe('search', () => {
  it('finds every word, accents and case aside, titles first', () => {
    const pages = [
      page('a', 'Hollow Gate', 'A town by the río.'),
      page('b', 'Rio Crossing', 'The ford.'),
      page('c', 'Mira', 'Nothing here.'),
    ]
    const hits = searchPages(pages, 'RIO')
    expect(hits.map((h) => [h.page.id, h.inTitle])).toEqual([
      ['b', true],
      ['a', false],
    ])
    expect(hits[1].snippet).toBe('A town by the río.')
    expect(searchPages(pages, '  ')).toEqual([])
  })
})

describe('renames', () => {
  it('moves a page and the links that reached it', () => {
    const tobin = page('tobin', 'npcs/Old Tobin', 'See [[Old Tobin#Past]].', 'vale')
    const pages = [
      tobin,
      page('gate', 'Gate', '[[Old Tobin|him]] and [[npcs/Old Tobin]] and [[Mira]]', 'vale'),
      page('far', 'Far', '[[Old Tobin]]', 'moor'),
    ]
    const changed = renamePage(pages, tobin, 'people/Tobin the Elder', LATER)
    expect(changed.map((p) => [p.id, p.path, p.body])).toEqual([
      ['tobin', 'people/Tobin the Elder', 'See [[Tobin the Elder#Past]].'],
      ['gate', 'Gate', '[[Tobin the Elder|him]] and [[people/Tobin the Elder]] and [[Mira]]'],
    ])
    expect(changed[1].modified).toBe(LATER)
  })
})

describe('the tree', () => {
  it('lays pages in folders, folders first, by name', () => {
    const tree = pageTree([
      page('a', 'npcs/Zed'),
      page('b', 'Index'),
      page('c', 'npcs/Ann'),
      page('d', 'places/towns/Gate'),
    ])
    expect(tree.pages.map(pageTitle)).toEqual(['Index'])
    expect(tree.folders.map((f) => f.path)).toEqual(['npcs', 'places'])
    expect(tree.folders[0].pages.map(pageTitle)).toEqual(['Ann', 'Zed'])
    expect(tree.folders[1].folders[0].path).toBe('places/towns')
  })

  it("reads a page's headings", () => {
    expect(pageHeadings('# Tobin\ntext\n## Secrets ##\n```\n# not one\n```')).toEqual([
      'Tobin',
      'Secrets',
    ])
  })
})

describe('as .md files', () => {
  const pages = [
    page('tobin', 'npcs/Old Tobin', 'Knows [[character:kael|Kael]] and [[Mira]].', 'vale'),
    page('rules', 'House rules', 'Roll [[map:a1b2#0608]].'),
  ]
  const url = (link: { kind: string; target: string }) =>
    `https://example.org/${link.kind}/${link.target}`
  const files = pagesToFiles(pages, {
    campaignFolder: () => 'The Vale',
    gameLink: (link) => ({ text: link.alias ?? link.target, url: url(link) }),
  })

  it('writes a folder per campaign, game links as Markdown links', () => {
    expect(files).toEqual({
      'The Vale/npcs/Old Tobin.md':
        'Knows [Kael](https://example.org/character/kael) and [[Mira]].',
      'General/House rules.md': 'Roll [a1b2](https://example.org/map/a1b2).',
    })
  })

  it('reads them back, into their campaigns, links into the games again', () => {
    let n = 0
    const read = filesToPages(
      { ...files, 'loose.md': 'x', 'The Vale/.obsidian/x.md': 'no', 'pic.png': '' },
      {
        campaignOfFolder: (f) => (f === 'The Vale' ? 'vale' : f === 'General' ? '' : null),
        into: 'moor',
        gameLinkOf: (u) => /example\.org\/(\w+)\/(.+)$/.exec(u)?.slice(1).join(':') ?? null,
        newId: () => `p${++n}`,
        now: LATER,
      },
    )
    expect(read.map((p) => [p.campaign, p.path, p.body])).toEqual([
      ['vale', 'npcs/Old Tobin', 'Knows [[character:kael|Kael]] and [[Mira]].'],
      [undefined, 'House rules', 'Roll [[map:a1b2|a1b2]].'],
      ['moor', 'loose', 'x'],
    ])
    const { put, replaced } = mergePages(pages, read)
    expect(replaced).toBe(2)
    expect(put.map((p) => p.id)).toEqual(['tobin', 'rules', 'p3'])
  })
})

describe('pictures', () => {
  it('finds the library pictures a page shows', () => {
    const body = `${pictureMarkdown('wolf', 'The grey wolf')}\n\n![](picture:tower) and ![x](https://e.org/a.png)`
    expect(body.startsWith('![The grey wolf](picture:wolf)')).toBe(true)
    expect(picturesIn(body)).toEqual(['wolf', 'tower'])
    expect(pictureMarkdown('a', 'one [two]\nthree')).toBe('![one  two  three](picture:a)')
  })

  it('exports them as files beside the pages and reads them back', () => {
    const pages = [
      page('a', 'npcs/Old Tobin', 'He keeps ![his dog](picture:dog).', 'vale'),
      page('b', 'Rumours', '![](picture:gone) ![web](https://e.org/a.png)'),
    ]
    const files = pagesToFiles(pages, {
      campaignFolder: () => 'The Vale',
      gameLink: () => null,
      pictureFile: (id) => (id === 'dog' ? 'pictures/Tobin dog.webp' : null),
    })
    expect(files['The Vale/npcs/Old Tobin.md']).toBe(
      'He keeps ![his dog](../../pictures/Tobin%20dog.webp).',
    )
    // A picture the library hasn't got keeps its reference.
    expect(files['General/Rumours.md']).toBe('![](picture:gone) ![web](https://e.org/a.png)')
    expect(picturesOfFiles(files)).toEqual(['pictures/Tobin dog.webp'])
    const read = filesToPages(files, {
      campaignOfFolder: (folder) =>
        folder === 'The Vale' ? 'vale' : folder === 'General' ? '' : null,
      gameLinkOf: () => null,
      newId: (() => {
        let n = 0
        return () => `p${++n}`
      })(),
      now: LATER,
      pictureOf: (path) => (path === 'pictures/Tobin dog.webp' ? 'dog2' : null),
    })
    expect(read.find((p) => p.path === 'npcs/Old Tobin')?.body).toBe(
      'He keeps ![his dog](picture:dog2).',
    )
  })
})
