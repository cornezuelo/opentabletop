import { describe, expect, it } from 'vitest'
import { filesToPages, findPage, parseLinks, type NotePage } from '@open-tabletop/notes'
import { gameIndex, linkedThing, linkFromUrl, pageThings } from '@open-tabletop/notes-ui'
import { emptyRoster, factionName, systemIdOf, travelSystems } from '@open-tabletop/session'
import { library } from '../play/packs'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'

/**
 * The Grey Marches' example pages (Notes) added to the example map's campaign, as Notes adds
 * them: every link reaches a page or a thing of the map, and every note of the map (its
 * cells', the ferrywoman's, the Iron Clans', the campaign's) reaches its page.
 */
const english = import.meta.glob('../../../../../packs/grey-marches/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const spanish = import.meta.glob('../../../../../packs/grey-marches/locales/es/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** The files by their path in the pack's notes (`places/Ashford.md`). */
const mdFiles = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(files).map(([path, text]) => [path.slice(path.indexOf('/notes/') + 7), text]),
  )

const opened = parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json)
const index = gameIndex(emptyRoster(), [opened.campaign], [opened.map], (campaign, id) => {
  const system = travelSystems(library.registry).systems.find(
    (s) => s.id === systemIdOf(campaign.factions?.system),
  )
  return system?.factions && factionName(system.factions, id, 'en')
})

function added(files: Record<string, string>): NotePage[] {
  let n = 0
  return filesToPages(files, {
    campaignOfFolder: () => null,
    into: opened.campaign.id,
    gameLinkOf: linkFromUrl,
    newId: () => `p${++n}`,
    now: '2026-11-26T10:00:00.000Z',
  })
}

describe('the Grey Marches’ example pages', () => {
  for (const [locale, dir] of [
    ['en', english],
    ['es', spanish],
  ] as const)
    it(`link to each other and to the example map (${locale})`, () => {
      const pages = added(mdFiles(dir))
      expect(pages.map((p) => p.path).sort()).toEqual([
        'The Grey Marches',
        'factions/The Iron Clans',
        'npcs/Brenna the ferrywoman',
        'places/Ashford',
        'places/Hollow Gate',
        'places/The ferry',
      ])
      for (const page of pages)
        for (const link of parseLinks(page.body)) {
          if (link.kind === 'page') {
            // One page is left to be written, to show a link that makes it.
            if (link.target === 'The Wet Ferret') continue
            expect(
              findPage(pages, link.target, page.campaign),
              `${page.path}: ${link.target}`,
            ).toBeDefined()
          } else
            expect(
              linkedThing(index, link),
              `${page.path}: ${link.kind}:${link.target}`,
            ).toBeDefined()
        }
    })

  it("are where the map's notes point", () => {
    const pages = added(mdFiles(english))
    const noted = index.things.filter((t) => t.noteRef)
    expect(noted.map((t) => [t.name, t.noteRef])).toEqual([
      ['The Grey Marches', 'The Grey Marches'],
      ['The Iron Clans', 'factions/The Iron Clans'],
      ['Ashford (0608)', 'places/Ashford'],
      ['The ferry (1011)', 'places/The ferry'],
      ['Brenna the ferrywoman', 'npcs/Brenna the ferrywoman'],
      ['Hollow Gate (1815)', 'places/Hollow Gate'],
    ])
    for (const thing of noted)
      expect(findPage(pages, thing.noteRef!, thing.campaign), thing.name).toBeDefined()
    const ashford = pages.find((p) => p.path === 'places/Ashford')!
    expect(
      pageThings(pages, index, ashford).map((t) => [t.thing.name, t.named, t.linksHere]),
    ).toEqual([['Ashford (0608)', true, true]])
  })
})
