import type { SessionState } from './index'

/** The place of another map, as a map's world names it (`@<map>/<place>`). */
const onMap = (map: string, place: string) => `@${map}/${place}`

/** Keys of a journal line's data that name a place. */
const PLACE_KEYS = ['place', 'hex', 'from', 'to']

/**
 * A trip carried from one map to another of its tree (into a sub-map, or out of it): the
 * same trip, members, journal and time. Places of the map it leaves become that map's
 * (`@<from>/<place>`), and those of the map it enters (`@<to>/<place>`) plain again, in
 * where the party is, what it visited, those present, discovery and the journal; the
 * route and destination are dropped. Returns a copy.
 */
export function moveTrip(session: SessionState, from: string, to: string): SessionState {
  const prefix = `@${to}/`
  const rename = (place: string): string =>
    place.startsWith(prefix)
      ? place.slice(prefix.length)
      : place.startsWith('@')
        ? place
        : onMap(from, place)
  const s = structuredClone(session)
  const travel = { ...s.travel }
  delete travel.route
  delete travel.destination
  s.travel = {
    ...travel,
    location: rename(travel.location),
    ...(travel.visits && {
      visits: Object.fromEntries(Object.entries(travel.visits).map(([p, n]) => [rename(p), n])),
    }),
  }
  if (s.present) s.present = s.present.map((p) => ({ ...p, at: rename(p.at) }))
  if (s.discovery) s.discovery = { ...s.discovery, pending: s.discovery.pending.map(rename) }
  s.journal = s.journal.map((e) => {
    if (!e.data || !PLACE_KEYS.some((k) => typeof e.data![k] === 'string')) return e
    const data = { ...e.data }
    for (const k of PLACE_KEYS) if (typeof data[k] === 'string') data[k] = rename(data[k] as string)
    return { ...e, data }
  })
  return s
}
