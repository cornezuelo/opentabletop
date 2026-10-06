import { createOracleUi } from '@open-tabletop/oracle-ui'
import { addEntry } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import { getLocale } from '../i18n/index.svelte'
import { fieldValues } from '../model/hex'
import type { HexKey } from '../model/types'
import { newId } from '../model/id'
import { editor } from '../store/editor.svelte'
import { library } from './packs'
import { editSession, partyLocation, sessionOf } from './play'
import { mapWorld } from './world'

/**
 * The embedded Oracle: any table of the loaded packs, rolled by hand. Its state (decks,
 * once-only entries) and history belong to the open map, shared with the trip's checks.
 */
export const oracleUi = createOracleUi({
  library,
  locale: getLocale,
  storageKey: 'opentabletop.hexmapper.oracle',
  store: {
    load: () => editor.map.oracle,
    save: ({ state, history }) => editor.setOracle({ state, history }),
  },
  // During a rules trip, hand rolls go to the journal too.
  onResult(item) {
    editSession((session) =>
      addEntry(session, {
        source: 'oracle',
        code: 'ORACLE_ROLL',
        text: item.resolution.text,
        data: { table: item.source },
      }),
    )
  },
})

// Another map was opened, or a trip step changed the map's Oracle state.
editor.onChange((change) => {
  if (change.kind === 'all') oracleUi.roller.reload()
  else if (change.kind === 'oracle' && editor.map.oracle)
    oracleUi.roller.state = editor.map.oracle.state
})

/** The hex rolls read: the selected one, or the party's. */
export const rollHex = (): HexKey | undefined => editor.selected ?? partyLocation()

/**
 * A rolled result kept on the map as a point of interest of a hex. Short results are its
 * name; long ones keep the table's name as the name and the text as the description.
 */
export function addResultAsPoi(hex: HexKey, text: string, tableName: string): void {
  const short = text.length <= 80
  editor.editHex(hex, (h) => ({
    ...h,
    pois: [
      ...(h.pois ?? []),
      { id: newId(), name: short ? text : tableName, ...(!short && { description: text }) },
    ],
  }))
}

/**
 * What the map already knows for a roll, with the keys travel checks use: the selected
 * hex (or the party's) with its terrain, tags and fields, and during a rules trip the
 * season, weather, travel mode, day, party stats and today's values.
 */
export function rollContext(): Record<string, unknown> {
  const play = editor.map.play
  const session = play ? sessionOf(play) : null
  const out: Record<string, unknown> = {}
  if (session) {
    const { travel } = session
    Object.assign(out, session.stats, session.dayVars, {
      season: defaultCalendar.describe(travel.time).season,
      weather: travel.weather,
      mode: travel.mode,
      day: travel.day,
    })
  }
  const hex = rollHex()
  const cell = hex ? mapWorld(editor.map).cell(hex) : null
  if (hex && cell) Object.assign(out, cell, { hex })
  // The selected token (an NPC, a monster…) and its values: {{token.name}}, {{token.might}}.
  const token = editor.selectedToken ? editor.getToken(editor.selectedToken) : undefined
  if (token) out.token = { name: token.name, kind: token.kind, ...fieldValues(token.fields) }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined && v !== null))
}
