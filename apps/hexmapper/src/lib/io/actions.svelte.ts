import { getLocale, t } from '../i18n/index.svelte'
import { createMap, type HexMap, MapFormatError, newId, serializeMap } from '@open-tabletop/map'
import {
  CampaignFormatError,
  createCampaign,
  deserializeCampaign,
  hasWorld,
  joinCampaign,
  landIn,
  leaveTrip,
  openMap,
  serializeCampaign,
  withSetup,
  type Campaign,
  type WhatStays,
} from '@open-tabletop/campaign'
import { DEFAULT_SYSTEM, systemIdOf, systemName } from '@open-tabletop/session'
import { campaignPlaces, type CampaignPlace } from '@open-tabletop/travel-ui'
import { editor, isCampaignChange } from '../store/editor.svelte'
import { getSystem } from '../play/systems'
import { ask, confirmAction, freeCampaignName, playing, showToast } from '@open-tabletop/ui-kit'
import { exampleState, forgetExample, rememberExample, type ExampleMap } from './examples'
import {
  allCampaigns,
  deleteCampaign,
  deleteLibraryMap,
  getCampaign,
  getLibraryMap,
  listCampaigns,
  listLibrary,
  onBeforeBackup,
  onCampaignChange,
  onLibraryChange,
  onBeforeRestore,
  putCampaign,
  putLibraryMap,
} from '@open-tabletop/storage'
import { parseDeepLink } from './deepLink'
import { downloadMap, pickMapFile } from './file'
import { mapToBundle, parseMapFile } from './otd'

const CURRENT_KEY = 'hexmapper.currentMap'
const PENDING_KEY = 'hexmapper.pending'
const PENDING_CAMPAIGN_KEY = 'hexmapper.pendingCampaign'

/** The time of a change (plain text, not reactive state). */
const now = (): string => new Date(Date.now()).toISOString()

/** Bumped whenever the library changes, so lists can refresh. */
/** `version`: bumped on every change of the library; `loaded`: once the first map is open. */
export const library = $state({ version: 0, loaded: false })

/**
 * A map to open, and its campaign when it brings one (a file, a map saved before campaigns);
 * `setup`, the system and packs a map saved before v25 chose, for its campaign kept here.
 */
interface Opening {
  map: HexMap
  campaign?: Campaign
  setup?: Pick<Campaign, 'system' | 'packs'>
}

/** The open map has changes not saved yet; `campaignDirty`, its campaign. */
let dirty = false
let campaignDirty = false
let timer: ReturnType<typeof setTimeout> | undefined
/** A backup is being restored: nothing may be saved over it before the page reloads. */
let frozen = false
/** The open map is being replaced by the one another window saved: not a change of ours. */
let taking = false

/** Writes the current map and its campaign now (those with unsaved changes). */
async function saveCurrent(): Promise<void> {
  clearTimeout(timer)
  if (frozen || (!dirty && !campaignDirty)) return
  const { map, campaign } = editor
  if (campaignDirty) {
    campaignDirty = false
    try {
      await putCampaign({
        id: campaign.id,
        name: campaign.name,
        modified: campaign.modified,
        json: serializeCampaign(campaign),
      })
    } catch (error) {
      // Not saved: try again with the next change or when the tab hides.
      campaignDirty = true
      throw error
    }
  }
  if (dirty) {
    dirty = false
    try {
      await putLibraryMap({
        id: map.meta.id,
        name: map.meta.name,
        modified: map.meta.modified,
        json: serializeMap(map),
      })
    } catch (error) {
      dirty = true
      throw error
    }
    library.version++
  }
  if (!dirty && !campaignDirty) clearPending()
}

/**
 * The campaign a map opens with: the one it brings (written where campaigns are kept), or
 * the one kept for it, or a new one of its own if there is none. One new here never takes
 * the name of another kept here (“The Marches (2)”).
 */
async function campaignFor({ map, campaign, setup }: Opening): Promise<Campaign> {
  if (campaign) {
    campaignDirty = true
    return (await keptCampaign(campaign.id)) ? campaign : named(campaign)
  }
  const stored = await keptCampaign(map.meta.campaign)
  // None kept: an empty one, saved once something happens in it.
  const found = stored ?? (await named(createCampaign(map.meta.campaign, map.meta.name)))
  const withIt = withSetup(found, setup)
  if (withIt !== found) campaignDirty = true
  return withIt
}

/** A campaign not kept here yet, with a name no campaign kept here has. */
async function named(campaign: Campaign): Promise<Campaign> {
  const name = await freeCampaignName(campaign.name, campaign.id)
  return name === campaign.name ? campaign : { ...campaign, name }
}

/** A campaign kept in this browser, or null if there's none (or it can't be read). */
async function keptCampaign(id: string): Promise<Campaign | null> {
  const entry = await getCampaign(id).catch(() => null)
  return entry ? safeCampaign(entry.json) : null
}

/** Replaces the open map, saving the previous one (and its campaign) first. */
async function switchTo(opening: Opening): Promise<void> {
  await saveCurrent().catch(console.error)
  const campaign = await campaignFor(opening)
  editor.load(opening.map, campaign)
  rememberCurrent(opening.map.meta.id)
  // A loaded map isn't in the library yet if it came from a file (or is saved in an older
  // format, with the parts its campaign took).
  dirty = true
  await saveCurrent().catch(console.error)
}

/**
 * A copy of a map (opened beside the one this browser has): a new id, and a campaign of its
 * own, so its world doesn't overwrite the first one's.
 */
function asCopy(opening: Opening): Opening {
  const id = newId()
  const map = { ...opening.map, meta: { ...opening.map.meta, id, campaign: id } }
  const campaign = opening.campaign && { ...opening.campaign, id }
  return { map, ...(campaign && { campaign }) }
}

/** Asks first: save the current map to a file, just create, or cancel. */
export async function newMap(): Promise<void> {
  const choice = await ask(t('newMap.title'), t('newMap.message'), [
    { value: 'cancel', label: t('newMap.cancel') },
    { value: 'create', label: t('newMap.create') },
    { value: 'save', label: t('newMap.saveAndCreate'), kind: 'primary' },
  ])
  if (choice !== 'create' && choice !== 'save') return
  if (choice === 'save') saveMap()
  await switchTo({ map: createMap() })
}

/**
 * A map put in a campaign from the Campaign app (`#/in-campaign/<campaign>[/<map>]`): a new
 * one, or one of the library (`map`), moved to it as Map settings → Campaign does (asking
 * what stays). False if the move was cancelled, `missing` if the map isn't kept here.
 */
export async function openInCampaign(campaign: string, map?: string): Promise<boolean | 'missing'> {
  if (map) {
    if (!(await openLibraryMap(map))) return 'missing'
  } else await switchTo({ map: createMap() })
  return moveToCampaign(campaign)
}

/**
 * Saves an OTD bundle (`<id>.otd.json`) that other OpenTabletop tools can read: the map with
 * its campaign.
 */
export function saveMap(): void {
  downloadMap(JSON.stringify(mapToBundle(editor.map, editor.campaign)), editor.map.meta.id)
}

/**
 * Opens a map file into the library; returns the id of the map loaded (null if none).
 * If the library already has a different version of that map, asks before replacing it.
 */
export async function openMapFile(): Promise<string | null> {
  const json = await pickMapFile()
  if (json === null) return null
  try {
    const opened = parseMapFile(json)
    const choice = await keepOrCopy(opened.map)
    if (!choice) return null
    const opening = choice === 'copy' ? asCopy(opened) : await withKeptCampaign(opened)
    if (!opening) return null
    await switchTo(opening)
    await sayCampaign()
    return opening.map.meta.id
  } catch (error) {
    showToast(errorMessage(error), 'error')
    return null
  }
}

/**
 * Opens a bundled example. If this browser already has it (with your play and changes),
 * asks whether to go on with that copy or start the example fresh.
 */
export async function openExampleMap(example: ExampleMap): Promise<void> {
  let id = example.id
  if (await getLibraryMap(example.id)) {
    // A newer app may bring a newer example than the one this map started from.
    const newer = exampleState(example) === 'newer'
    const choice = await ask(
      t(newer ? 'library.exampleNewerTitle' : 'library.exampleTitle'),
      t(newer ? 'library.exampleNewer' : 'library.exampleExists'),
      [
        { value: 'cancel', label: t('newMap.cancel') },
        { value: 'fresh', label: t('library.exampleFresh'), kind: 'danger' },
        { value: 'beside', label: t('library.exampleBeside') },
        { value: 'open', label: t('library.exampleOpen'), kind: 'primary' },
      ],
    )
    if (choice === 'open') {
      await openLibraryMap(example.id)
      return
    }
    if (choice === 'beside') id = newId()
    else if (choice !== 'fresh') return
  }
  try {
    const opened = parseMapFile(example.json)
    const opening =
      id === example.id
        ? await inExampleCampaign(opened)
        : asCopy({ ...opened, map: { ...opened.map, meta: { ...opened.map.meta, id } } })
    if (!opening) return
    await switchTo(opening)
    rememberExample(id, example)
    await sayCampaign()
  } catch (error) {
    showToast(errorMessage(error), 'error')
  }
}

/**
 * An example whose campaign other maps or trips here are in (another example map of it):
 * it joins that campaign, its world kept (the map keeps the land of the factions it has).
 * Alone in it, the example's campaign starts fresh with it. Not kept here, while other
 * campaigns are (`closeCampaigns`): asks whether to join one of them or start its own.
 * Null on cancel.
 */
async function inExampleCampaign(
  opening: Opening & { campaign: Campaign },
): Promise<Opening | null> {
  const id = opening.campaign.id
  await saveCurrent().catch(console.error)
  const kept = await keptCampaign(id)
  if (!kept) return joinOrOwn(opening)
  const others = (await campaignPlaces(id)).filter(
    (p) => p.app !== 'hexmapper' || p.id !== opening.map.meta.id,
  )
  if (!kept || !others.length) return opening
  const map = { ...opening.map, territories: landIn(kept, opening.map.territories) }
  if (!map.territories) delete map.territories
  return { map }
}

/** How many campaigns an example offers to join, at most (the latest changed). */
const JOINABLE = 3

/**
 * Campaigns kept here an example could have meant to join (its campaign isn't kept): those
 * with its campaign's name, or played with its system (unless that's the default one,
 * which campaigns of any game play); the latest changed first.
 */
async function closeCampaigns(example: Campaign): Promise<Campaign[]> {
  const name = example.name.trim().toLowerCase()
  const system = systemIdOf(example.system)
  return (await allCampaigns().catch(() => []))
    .map((entry) => safeCampaign(entry.json))
    .filter(
      (c): c is Campaign =>
        !!c &&
        c.id !== example.id &&
        ((!!name && c.name.trim().toLowerCase() === name) ||
          (system !== DEFAULT_SYSTEM && systemIdOf(c.system) === system)),
    )
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, JOINABLE)
}

/**
 * An example whose campaign isn't kept here, while campaigns like it are (another map of
 * the same game, started before): join one of them (the example's world left out; the map
 * keeps the land of the factions it has), or start the example's own campaign. Null on
 * cancel.
 */
async function joinOrOwn(opening: Opening & { campaign: Campaign }): Promise<Opening | null> {
  const close = await closeCampaigns(opening.campaign)
  if (!close.length) return opening
  const name = (c: Campaign) => c.name || t('map.untitled')
  const choice = await ask(
    t('library.exampleCampaignTitle'),
    t('library.exampleCampaign', {
      campaign: name(opening.campaign),
      others: close.map((c) => `“${name(c)}”`).join(', '),
    }),
    [
      { value: 'cancel', label: t('newMap.cancel') },
      { value: 'own', label: t('library.exampleCampaignOwn') },
      ...close.map((c, i) => ({
        value: c.id,
        label: t('campaign.join', { campaign: name(c) }),
        ...(i === 0 && { kind: 'primary' as const }),
      })),
    ],
  )
  if (choice === 'own') return opening
  const to = close.find((c) => c.id === choice)
  if (!to) return null
  const map: HexMap = {
    ...opening.map,
    meta: { ...opening.map.meta, campaign: to.id },
    territories: landIn(to, opening.map.territories),
  }
  if (!map.territories) delete map.territories
  return { map }
}

/**
 * A file whose campaign this browser has already (another map of it, a friend's; §9.3 of
 * campaigns.md): join the one kept here (the file's world left out; the map keeps the land
 * of the factions it has), replace it with the file's, or keep the file's apart, in a
 * campaign of its own. Null on cancel.
 */
async function withKeptCampaign(
  opening: Opening & { campaign: Campaign },
): Promise<Opening | null> {
  const file = opening.campaign
  if (file.id === editor.campaign.id) await saveCurrent().catch(console.error)
  const kept = await keptCampaign(file.id)
  if (!kept || serializeCampaign(kept) === serializeCampaign(file)) return opening
  const date = (iso: string) => new Date(iso).toLocaleString(getLocale())
  const choice = await ask(
    t('file.campaignExistsTitle'),
    t('file.campaignExists', {
      name: kept.name || t('map.untitled'),
      mine: date(kept.modified),
      file: date(file.modified),
    }),
    [
      { value: 'cancel', label: t('newMap.cancel') },
      { value: 'apart', label: t('file.campaignApart') },
      { value: 'replace', label: t('file.replace'), kind: 'danger' },
      { value: 'join', label: t('file.campaignJoin'), kind: 'primary' },
    ],
  )
  if (choice === 'replace') return opening
  if (choice === 'apart') {
    const id = newId()
    const map = { ...opening.map, meta: { ...opening.map.meta, campaign: id } }
    return { map, campaign: { ...file, id } }
  }
  if (choice !== 'join') return null
  const map = { ...opening.map, territories: landIn(kept, opening.map.territories) }
  if (!map.territories) delete map.territories
  return { map }
}

/**
 * A file of a map this browser already has (maybe an older backup): replace the
 * library's copy, keep both (the file gets a new id, and a campaign of its own) or cancel.
 * Null on cancel.
 */
async function keepOrCopy(map: HexMap): Promise<'replace' | 'copy' | null> {
  if (map.meta.id === editor.map.meta.id) await saveCurrent().catch(console.error)
  const existing = await getLibraryMap(map.meta.id)
  if (!existing || existing.json === serializeMap(map)) return 'replace'
  const date = (iso: string) => new Date(iso).toLocaleString(getLocale())
  const choice = await ask(
    t('file.existsTitle'),
    t('file.exists', {
      name: existing.name || t('map.untitled'),
      mine: date(existing.modified),
      file: date(map.meta.modified),
    }),
    [
      { value: 'cancel', label: t('newMap.cancel') },
      { value: 'copy', label: t('file.keepBoth') },
      { value: 'replace', label: t('file.replace'), kind: 'danger' },
    ],
  )
  return choice === 'copy' || choice === 'replace' ? choice : null
}

export async function openLibraryMap(id: string): Promise<boolean> {
  if (id === editor.map.meta.id) return true
  const entry = await getLibraryMap(id)
  if (!entry) return false
  try {
    await switchTo(openMap(entry.json))
    await sayCampaign()
    return true
  } catch (error) {
    showToast(errorMessage(error), 'error')
    return false
  }
}

export async function removeLibraryMap(id: string): Promise<void> {
  const open = id === editor.map.meta.id
  // Nothing of the open map may be saved again once it's gone.
  if (open) {
    clearTimeout(timer)
    dirty = false
    campaignDirty = false
  }
  const entry = await getLibraryMap(id)
  await deleteLibraryMap(id)
  forgetExample(id)
  library.version++
  // Its campaign goes with it, unless another map of the library is in it.
  const campaign = entry && safeOpen(entry.json)?.map.meta.campaign
  if (campaign && !(await campaignInUse(campaign))) await deleteCampaign(campaign)
  if (open) await switchTo({ map: createMap() })
}

/** Whether a map of the library or a trip of Travel is in this campaign. */
async function campaignInUse(campaign: string): Promise<boolean> {
  return (await campaignPlaces(campaign)).length > 0
}

/** The maps and trips of the open map's campaign besides this map. */
async function othersInCampaign(campaign = editor.campaign.id): Promise<CampaignPlace[]> {
  const id = editor.map.meta.id
  return (await campaignPlaces(campaign)).filter((p) => p.app !== 'hexmapper' || p.id !== id)
}

/** Places by name, for a message: “North”, “To Keld”. */
const placesText = (places: CampaignPlace[]) =>
  places
    .map((p) => `“${p.name || t(p.app === 'hexmapper' ? 'map.untitled' : 'campaign.trip')}”`)
    .join(', ')

/**
 * Says, in a toast, which campaign the map just opened is in and which maps and trips are
 * in it too, so two campaigns of the same name or game aren't confused.
 */
async function sayCampaign(): Promise<void> {
  const others = await othersInCampaign()
  const campaign = editor.campaign.name || t('map.untitled')
  showToast(
    others.length
      ? t('campaign.openedWith', { campaign, places: placesText(others) })
      : t('campaign.openedAlone', { campaign }),
    'info',
    6000,
  )
}

/** The campaigns this browser keeps, by name (the open map's among them), for choosing one. */
export async function keptCampaigns(): Promise<{ id: string; name: string }[]> {
  const kept = await listCampaigns().catch(() => [])
  return kept.map(({ id, name }) => ({ id, name }))
}

/**
 * Changes the system of the open map's campaign (Map settings, or a new trip with another
 * one): if other maps or trips are in it, asks first, since it's theirs too. False if not.
 */
export async function chooseSystem(system: string): Promise<boolean> {
  const id = systemIdOf(system)
  if (id === systemIdOf(editor.setup.system)) return true
  const others = await othersInCampaign()
  if (
    others.length &&
    !(await confirmAction(t('campaign.systemShared', { places: placesText(others) }), {
      danger: false,
    }))
  )
    return false
  editor.setCampaignSetup({ system: id === DEFAULT_SYSTEM ? undefined : id })
  return true
}

/**
 * Moves the open map to another campaign kept here (`campaign`; the map's own id: one of
 * its own again). If its campaign has a world (a clock, factions, Oracle rolls), asks what
 * stays (§5 of campaigns.md): the campaign's (the map keeps the land of its factions), or
 * the map's, which takes its place. The campaign it leaves is deleted if nothing else is in
 * it. False if cancelled.
 */
export async function moveToCampaign(campaign: string): Promise<boolean> {
  const from = editor.campaign
  if (campaign === from.id) return true
  await saveCurrent().catch(console.error)
  const { map } = editor
  const to =
    (await keptCampaign(campaign)) ??
    (await named(createCampaign(campaign, campaign === map.meta.id ? map.meta.name : '')))
  let stays: WhatStays = 'theirs'
  if (hasWorld(from)) {
    const theirs = hasWorld(to)
    const name = to.name || t('map.untitled')
    const choice = await ask(
      t('campaign.whatStaysTitle', { campaign: name }),
      t(theirs ? 'campaign.whatStays' : 'campaign.bringWorld', { campaign: name }),
      [
        { value: 'cancel', label: t('newMap.cancel') },
        {
          value: 'theirs',
          label: t(theirs ? 'campaign.keepTheirs' : 'campaign.leaveBehind'),
          ...(theirs && { kind: 'primary' as const }),
        },
        {
          value: 'mine',
          label: t('campaign.bringMine'),
          ...(theirs ? { kind: 'danger' as const } : { kind: 'primary' as const }),
        },
      ],
    )
    if (choice !== 'theirs' && choice !== 'mine') return false
    stays = choice
  }
  if (editor.campaign !== from || editor.map !== map) return false
  const joined = joinCampaign(from, to, stays)
  const land = stays === 'mine' ? map.territories : landIn(joined, map.territories)
  // The campaign it leaves: without this map's trip, or gone if nothing else is in it.
  const left = leaveTrip(from, { app: 'hexmapper', id: map.meta.id })
  const othersLeft = await othersInCampaign(from.id)
  editor.moveToCampaign(joined, land)
  // Both are saved now: the map names its new campaign, which may be new here.
  dirty = true
  campaignDirty = true
  await saveCurrent().catch(console.error)
  if (othersLeft.length) {
    const changed = { ...left, modified: now() }
    await putCampaign({
      id: changed.id,
      name: changed.name,
      modified: changed.modified,
      json: serializeCampaign(changed),
    }).catch(console.error)
  } else await deleteCampaign(from.id).catch(console.error)
  if (systemIdOf(joined.system) !== systemIdOf(from.system))
    showToast(
      t('campaign.adopted', {
        system: systemName(getSystem(systemIdOf(joined.system)), getLocale()),
      }),
      'info',
      6000,
    )
  return true
}

export { listLibrary }

/**
 * Opens the initial map (deep link, last open map, or newest in the library) and
 * keeps the library in sync with every change. IndexedDB writes are async and can be
 * cut off when the tab closes, so on page hide a synchronous copy also goes to
 * localStorage; on start it wins if it's newer.
 */
export async function startPersistence(): Promise<() => void> {
  try {
    const initial = await initialMap()
    editor.load(initial.map, await campaignFor(initial))
    rememberCurrent(initial.map.meta.id)
    // A map saved before campaigns is saved again without the parts its campaign took.
    if (initial.campaign) dirty = true
  } catch {
    showToast(t('file.errorAutosave'), 'error')
  }
  library.loaded = true

  const stop = editor.onChange((change) => {
    if (taking) return
    if (change.kind === 'factions' || isCampaignChange(change)) campaignDirty = true
    if (!isCampaignChange(change)) dirty = true
    clearTimeout(timer)
    timer = setTimeout(() => saveCurrent().catch(console.error), 500)
  })
  const saveNow = () => {
    if ((!dirty && !campaignDirty) || frozen) return
    if (dirty) writePending(PENDING_KEY, serializeMap(editor.map))
    if (campaignDirty) writePending(PENDING_CAMPAIGN_KEY, serializeCampaign(editor.campaign))
    saveCurrent().catch(console.error)
  }
  const onVisibility = () => document.visibilityState === 'hidden' && saveNow()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', saveNow)
  const stopHearing = onLibraryChange((change) => {
    library.version++
    if (change.type === 'put' && change.id === editor.map.meta.id)
      takeFromElsewhere().catch(console.error)
  })
  const stopHearingCampaigns = onCampaignChange((change) => {
    if (change.type === 'put' && change.id === editor.campaign.id)
      takeCampaignFromElsewhere().catch(console.error)
  })
  // A backup includes the open map as it is now; a restore must not be overwritten by it.
  const stopBackup = onBeforeBackup(() => saveCurrent())
  const stopRestore = onBeforeRestore(async () => {
    // Saved first, so "add to mine" compares the map as it is now.
    await saveCurrent().catch(console.error)
    frozen = true
    return () => (frozen = false)
  })
  return () => {
    saveCurrent().catch(console.error)
    stop()
    stopBackup()
    stopRestore()
    stopHearing()
    stopHearingCampaigns()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', saveNow)
  }
}

/**
 * Another window or app saved the open map (a world turn in the Campaign app, the same map
 * in another tab): it is read again, unless this window has changes not saved yet, which
 * are saved over it (the last write wins, and the other window reads them in turn).
 */
async function takeFromElsewhere(): Promise<void> {
  if (dirty || frozen) return
  const id = editor.map.meta.id
  const entry = await getLibraryMap(id)
  if (!entry || dirty || id !== editor.map.meta.id) return
  const next = safeOpen(entry.json)?.map
  if (!next) return
  taking = true
  try {
    if (!editor.takeFromElsewhere(next)) showToast(t('file.changedElsewhere'))
  } finally {
    taking = false
  }
}

/**
 * Another window or app saved the open map's campaign (a world turn, another map of it
 * played): it is read again, unless this window's changes to it are not saved yet.
 */
async function takeCampaignFromElsewhere(): Promise<void> {
  if (campaignDirty || frozen) return
  const id = editor.campaign.id
  const entry = await getCampaign(id)
  if (!entry || campaignDirty || id !== editor.campaign.id) return
  const next = safeCampaign(entry.json)
  if (!next) return
  taking = true
  try {
    editor.takeCampaign(next)
  } finally {
    taking = false
  }
}

/**
 * The map to open first (deep link, last open map, or newest in the library), from the
 * library or from the crash copy written when the tab closed, whichever is newer; and its
 * campaign's crash copy if newer than the one kept.
 */
/**
 * The map to open in the campaign being played (the bar's **Playing**): the last one open if
 * it's in it, else its newest map; none without one, or if it has no maps.
 */
async function lastInPlaying(): Promise<string | undefined> {
  const campaign = playing.id
  if (!campaign) return undefined
  const maps = new Set(
    (await campaignPlaces(campaign)).filter((p) => p.app === 'hexmapper').map((p) => p.id),
  )
  const last = readCurrent()
  if (last && maps.has(last)) return last
  return (await listLibrary()).find((entry) => maps.has(entry.id))?.id
}

async function initialMap(): Promise<Opening> {
  const pending = readPending(PENDING_KEY)
  const pendingMap = pending ? safeOpen(pending) : null
  const linked = parseDeepLink(location.hash)?.mapId
  const ids = [linked, await lastInPlaying(), readCurrent(), (await listLibrary())[0]?.id].filter(
    (id): id is string => !!id,
  )
  let found: Opening | null = null
  for (const id of ids) {
    const entry = await getLibraryMap(id)
    const stored = entry ? safeOpen(entry.json) : null
    const fromPending = pendingMap?.map.meta.id === id ? pendingMap : null
    const newest = [stored, fromPending]
      .filter((m): m is Opening => !!m)
      .sort((a, b) => b.map.meta.modified.localeCompare(a.map.meta.modified))[0]
    if (newest) {
      if (newest === fromPending) dirty = true
      found = newest
      break
    }
  }
  if (!found && pendingMap) {
    dirty = true
    found = pendingMap
  }
  // A new map, saved (with its campaign) once it changes.
  if (!found) return { map: createMap() }
  const pendingCampaign = readPending(PENDING_CAMPAIGN_KEY)
  const crash = pendingCampaign ? safeCampaign(pendingCampaign) : null
  if (crash && crash.id === found.map.meta.campaign && !found.campaign) {
    const entry = await getCampaign(crash.id).catch(() => null)
    const kept = entry ? safeCampaign(entry.json) : null
    if (!kept || kept.modified < crash.modified) return { ...found, campaign: crash }
  }
  return found
}

function safeOpen(json: string): Opening | null {
  try {
    return openMap(json)
  } catch {
    return null
  }
}

function safeCampaign(json: string): Campaign | null {
  try {
    return deserializeCampaign(json)
  } catch {
    return null
  }
}

function errorMessage(error: unknown): string {
  if (
    (error instanceof MapFormatError || error instanceof CampaignFormatError) &&
    error.code === 'newerVersion'
  )
    return t('file.errorNewer')
  return t('file.errorInvalid')
}

function readCurrent(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

function rememberCurrent(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id)
  } catch {
    // Not remembered; the newest map opens next time.
  }
}

function readPending(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePending(key: string, json: string): void {
  try {
    localStorage.setItem(key, json)
  } catch {
    // Quota exceeded (large embedded assets) or storage disabled: IndexedDB still tries.
  }
}

function clearPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
    localStorage.removeItem(PENDING_CAMPAIGN_KEY)
  } catch {
    // Ignore.
  }
}
