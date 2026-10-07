import { calendarOf, localize } from '@open-tabletop/session'
import { defaultCalendar, type Calendar, type DataCalendar } from '@open-tabletop/time'
import {
  createWorld,
  initialWorld,
  type WorldAction,
  type WorldEvent,
  type WorldState,
} from '@open-tabletop/world-engine'
import { getLocale } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { sessionOf } from './play'
import { getSystem } from './systems'

/**
 * The map's world clock: the campaign's time, events scheduled on it and progress
 * clocks. It names time with the calendar of the system the map plays (or the default
 * one). Rules trips move it forward; outside a trip it's moved by hand. Play state: saved
 * with the map, outside the undo history.
 */

/** The calendar the world uses: the play system's own, or the default one. */
export function worldCalendar(): Calendar {
  const system = editor.play?.rules?.system
  return system ? calendarOf(getSystem(system)) : defaultCalendar
}

const world = () => createWorld({ calendar: worldCalendar() })

/** Starts the clock: at the trip's time if one is going on, else dawn of day 1. */
export function startWorld(): void {
  const play = editor.map.play
  const session = play ? sessionOf(play) : null
  const time = session?.travel.time ?? worldCalendar().at(1, '06:00')
  editor.setWorld(initialWorld(time))
}

/** Stops it (forgets its events, clocks and timeline). */
export function stopWorld(): void {
  editor.setWorld(undefined)
}

/** Applies an action to the world clock; returns what happened. */
export function worldAct(action: WorldAction): WorldEvent[] {
  const state = editor.map.world
  if (!state) return []
  const { state: next, events } = world().apply(state, action)
  editor.setWorld(next)
  return events
}

/** Events still to come. */
export const upcoming = (state: WorldState, limit = 12) => world().upcoming(state, limit)

/**
 * A trip moved time on: the world follows, and what came due on the way is told
 * (events and holidays), as journal lines.
 */
export function followTrip(time: number): { code: string; text: string; time: number }[] {
  if (!editor.map.world || time <= editor.map.world.time) return []
  const calendar = worldCalendar() as Partial<DataCalendar>
  const holidayName = (id: string) => {
    const h = calendar.def?.holidays?.find((x) => x.id === id)
    return localize(h?.name, getLocale(), 'en') ?? id
  }
  return worldAct({ type: 'setTime', time }).flatMap((e) =>
    e.type === 'EVENT_DUE'
      ? [{ code: 'WORLD_EVENT', text: e.event.name, time: e.time }]
      : e.type === 'HOLIDAY'
        ? [{ code: 'HOLIDAY', text: holidayName(e.id), time: e.time }]
        : [],
  )
}
