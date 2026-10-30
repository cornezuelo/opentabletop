import { render } from 'svelte/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toasts } from '@open-tabletop/ui-kit'
import PlayPanel from '../../components/PlayPanel.svelte'
import WorldPanel from '../../components/WorldPanel.svelte'
import { deserializeMap, serializeMap } from '@open-tabletop/map'
import { deserializeCampaign, openMap, serializeCampaign } from '@open-tabletop/campaign'
import { editor } from '../store/editor.svelte'
import { clickHex, editSession, sessionOf, step } from './play'

/**
 * Library maps of the example with a trip going on, written by each release
 * (`old-maps.gen.test.ts`, `make old-maps`): a map stored by any older version must keep
 * opening in Play, and its trip must go on.
 */
const MAPS = Object.entries(
  import.meta.glob<string>('./old-maps/*.json', { query: '?raw', import: 'default', eager: true }),
).map(([path, json]) => ({ name: path.split('/').pop()!, json }))

const trip = () => sessionOf(editor.map.play!)!

/**
 * A stored map as Map opens it: before campaigns, the map alone (its world goes
 * to a campaign of its own); since, the map and its campaign as they're kept.
 */
function openStored(json: string) {
  const stored = JSON.parse(json) as { map?: unknown; campaign?: unknown; version?: number }
  if (stored.version === undefined && stored.map && stored.campaign)
    return {
      map: openMap(JSON.stringify(stored.map)).map,
      campaign: deserializeCampaign(JSON.stringify(stored.campaign)),
    }
  const opened = openMap(json)
  expect(opened.campaign?.id).toBe(opened.map.meta.id)
  return opened
}

/**
 * Heads for another hex and marches on (waiting for the next day if this one's march is
 * done): time goes on, though the party may stay where it is (lost, going in circles…).
 */
function marchOn() {
  const start = trip().travel.time
  clickHex(trip().travel.location === '7,7' ? '4,2' : '7,7')
  for (let i = 0; i < 4; i++) {
    const before = trip().travel.time
    step({ type: 'travel', until: 'place' })
    if (trip().travel.time === before) step({ type: 'wait', until: before + 18 * 60 })
  }
  expect(trip().travel.time).toBeGreaterThan(start)
  expect(
    trip().journal.some((e) => e.code === 'PLACE_ENTERED' && (e.data?.time as number) > start),
  ).toBe(true)
}

const panelText = () => render(PlayPanel).body.replace(/<[^>]+>/g, ' ')

/** Opens the map, shows Play and the World view, resolves what waits and marches on. */
function playOn(json: string) {
  editor.open(openStored(json))
  expect(panelText()).toMatch(/Day \d/)
  render(WorldPanel)
  for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
  expect(trip().travel.pendingChecks).toEqual([])
  marchOn()
  expect(panelText()).toMatch(/Day \d/)
  // What the last step did, under the buttons, kept when the map is saved and opened again.
  const last = trip().lastStep
  expect(last).toBeGreaterThan(0)
  expect(panelText()).toMatch(/What just happened/)
  editor.load(
    deserializeMap(serializeMap(editor.map)),
    deserializeCampaign(serializeCampaign(editor.campaign)),
  )
  expect(trip().lastStep).toBe(last)
}

describe('old library maps with a trip going on', () => {
  beforeEach(() => void vi.spyOn(Math, 'random').mockReturnValue(0.42))

  it('there is one of every release', () => {
    const tags = new Set(MAPS.map((m) => m.name.match(/(v\d+\.\d+\.\d+)-/)?.[1]))
    expect([...tags]).toEqual(expect.arrayContaining(['v0.1.0', 'v0.4.0', 'v0.5.0']))
  })

  for (const { name, json } of MAPS) it(name, { timeout: 60_000 }, () => playOn(json))

  it('a map stored with its campaign (as `make old-maps` writes them now) plays on', () => {
    editor.open(openStored(MAPS.find((m) => m.name.endsWith('-camped.json'))!.json))
    const stored = JSON.stringify({
      map: JSON.parse(serializeMap(editor.map)),
      campaign: editor.campaign,
    })
    const world = editor.campaign.world
    expect(world).toBeDefined()
    playOn(stored)
    expect(editor.campaign.world!.time).toBeGreaterThan(world!.time)
  })

  it('a trip whose system changed under it goes on', () => {
    const pending = MAPS.filter((m) => m.name.endsWith('-pending.json'))
    editor.open(openStored(pending.sort((a, b) => a.name.localeCompare(b.name)).pop()!.json))
    // What the stored trip names and the system no longer declares: a check waiting to be
    // resolved and a value of the party.
    editSession((s) => ({
      ...s,
      stats: { ...s.stats, gone: 3 },
      travel: {
        ...s.travel,
        pendingChecks: s.travel.pendingChecks.map((c) => ({ ...c, event: 'GONE_CHECK_REQUIRED' })),
      },
    }))
    const shown = toasts.length
    expect(panelText()).toMatch(/Day \d/)
    for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
    expect(trip().travel.pendingChecks).toEqual([])
    marchOn()
    expect(toasts.length).toBe(shown)
  })
})
