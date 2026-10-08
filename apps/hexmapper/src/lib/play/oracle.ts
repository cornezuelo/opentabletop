import { createOracleUi } from '@open-tabletop/oracle-ui'
import { addEntry, qualify, tripFacts } from '@open-tabletop/session'
import { getSystem, mapPacks } from './systems'
import { getLocale } from '../i18n/index.svelte'
import { fieldValues } from '../model/hex'
import type { HexKey } from '../model/types'
import { newId } from '../model/id'
import { editor } from '../store/editor.svelte'
import { library } from './packs'
import { editSession, partyLocation, sessionOf } from './play'
import { mapWorld } from './world'
import { worldFactsNow } from './world.svelte'

/**
 * The embedded Oracle: any table of the loaded packs, rolled by hand. Its state (decks,
 * once-only entries) and history belong to the open map, shared with the trip's checks.
 */
export const oracleUi = createOracleUi({
  library,
  locale: getLocale,
  storageKey: 'opentabletop.hexmapper.oracle',
  // Only the packs this map works with: its system's and the ones it adds (Map settings → Map).
  packs: mapPacks,
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
 * season, weather, travel mode, day, party stats (also as `party`) and today's values.
 */
export function rollContext(): Record<string, unknown> {
  const play = editor.map.play
  const session = play ? sessionOf(play) : null
  const hex = rollHex()
  const cell = hex ? mapWorld(editor.map).cell(hex) : null
  const facts: Record<string, unknown> = hex && cell ? { ...cell, hex: { ...cell, id: hex } } : {}
  const world = worldFactsNow()
  // What the trip's checks would see (the moment, the trip, the party, today's values, the
  // world clock), with the selected hex's facts in place of the party's.
  const out: Record<string, unknown> = session
    ? {
        ...tripFacts(
          {
            system: getSystem(play!.rules!.system),
            world: mapWorld(editor.map, getSystem(play!.rules!.system).rules.travel.hexKm),
            facts: world,
          },
          session,
        ),
        ...facts,
      }
    : { ...world, ...facts }
  // The selected token (an NPC, a monster…) and its values: {{token.name}}, {{token.might}}.
  const token = editor.selectedToken ? editor.getToken(editor.selectedToken) : undefined
  // Its own values can't hide its name and kind.
  if (token) out.token = { ...fieldValues(token.fields), name: token.name, kind: token.kind }
  // With their full names too (`hex.terrain`, `time.season`, `world.clocks`…).
  return Object.fromEntries(
    Object.entries(qualify(out)).filter(([, v]) => v !== undefined && v !== null),
  )
}
