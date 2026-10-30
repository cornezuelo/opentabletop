import { mapWorld } from '@open-tabletop/map'
import { connectionsOpen, type SessionState } from '@open-tabletop/session'
import { editor } from '../store/editor.svelte'
import { getSystem } from './systems'

/** A connection drawn on the map as the trip played on it has it now. */
export interface ConnectionNow {
  /** Whether it can be crossed now (its kind's `passable`, seeing its state in the trip). */
  open: boolean
  /** Its values the trip changed (`state: open`), over the map's. */
  changed: Record<string, unknown>
}

/** The map's connections by id as the trip going on has them; empty with no trip. */
export function connectionsNow(): Map<string, ConnectionNow> {
  const play = editor.map.play
  const session = play?.mode === 'rules' ? (play.rules?.session as SessionState | null) : null
  const out = new Map<string, ConnectionNow>()
  if (!session?.travel || !play?.rules || !editor.map.connections.length) return out
  const system = getSystem(play.rules.system)
  const world = mapWorld(editor.map, system.rules.travel.hexKm)
  const { connections } = editor.map
  const open = connectionsOpen(
    { system, world },
    session,
    connections.map((c) => c.between),
  )
  connections.forEach((c, i) =>
    out.set(c.id, { open: open[i], changed: session.travel.connections?.[c.id] ?? {} }),
  )
  return out
}
