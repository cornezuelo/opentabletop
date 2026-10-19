import { getLocale, t } from '../i18n/index.svelte'
import { createMap, type HexMap, MapFormatError, newId, serializeMap } from '@open-tabletop/map'
import {
  CampaignFormatError,
  createCampaign,
  deserializeCampaign,
  openMap,
  serializeCampaign,
  type Campaign,
} from '@open-tabletop/campaign'
import { editor, isCampaignChange } from '../store/editor.svelte'
import { ask, showToast } from '@open-tabletop/ui-kit'
import { exampleState, forgetExample, rememberExample, type ExampleMap } from './examples'
import {
  allLibraryMaps,
  deleteCampaign,
  deleteLibraryMap,
  getCampaign,
  getLibraryMap,
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

/** Bumped whenever the library changes, so lists can refresh. */
export const library = $state({ version: 0 })

/** A map to open, and its campaign when it brings one (a file, a map saved before campaigns). */
interface Opening {
  map: HexMap
  campaign?: Campaign
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
 * the one kept for it, or a new one of its own if there is none.
 */
async function campaignFor({ map, campaign }: Opening): Promise<Campaign> {
  if (campaign) {
    campaignDirty = true
    return campaign
  }
  const entry = await getCampaign(map.meta.campaign).catch(() => null)
  const stored = entry ? safeCampaign(entry.json) : null
  // None kept: an empty one, saved once something happens in it.
  return stored ?? createCampaign(map.meta.campaign, map.meta.name)
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
    const opening = choice === 'copy' ? asCopy(opened) : opened
    await switchTo(opening)
    showToast(t('file.loaded'))
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
    await switchTo(
      id === example.id
        ? opened
        : asCopy({ ...opened, map: { ...opened.map, meta: { ...opened.map.meta, id } } }),
    )
    rememberExample(id, example)
    showToast(t('file.loaded'))
  } catch (error) {
    showToast(errorMessage(error), 'error')
  }
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

/** Whether a map of the library is in this campaign. */
async function campaignInUse(campaign: string): Promise<boolean> {
  for (const entry of await allLibraryMaps())
    if (safeOpen(entry.json)?.map.meta.campaign === campaign) return true
  return false
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
async function initialMap(): Promise<Opening> {
  const pending = readPending(PENDING_KEY)
  const pendingMap = pending ? safeOpen(pending) : null
  const linked = parseDeepLink(location.hash)?.mapId
  const ids = [linked, readCurrent(), (await listLibrary())[0]?.id].filter(
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
