import type { Until, WorldAction } from '@open-tabletop/world-engine'

/**
 * What the world clock's UI does, given by its host: Map with a map open (a trip
 * on it travels or waits as time moves), the Campaign app (the campaign alone).
 */
export interface WorldControls {
  /** Starts the clock at a moment. */
  start(time: number): void
  /** Stops it (its events, clocks and timeline are forgotten). */
  stop(): void
  /** An action on the clock (schedule, tick, a note…). */
  act(action: WorldAction): void
  /** Moves time on (during a trip, the party travels or waits until then). */
  advance(how: { minutes: number } | { until: Until }): Promise<void>
  /** Sets the date: later is moving time on, earlier asks first. */
  setDate(time: number): Promise<void>
  /** Adds the clocks the system declares that the world doesn't have yet. */
  bringClocks(): void
  /** Goes on with what the world waits for: a question's choice, or nothing after a pause. */
  answer(choice?: string): void
}

/** A trip going on where the world is played: whether it travels on, and where to (or waits). */
export interface WorldTrip {
  travelling: boolean
  /** The hex it heads to (travelling) or waits at, as the map writes it. */
  hex: string
}

/** A part of the world clock's UI, for a host that shows them in tabs (`all`: every one). */
export type WorldPart = 'all' | 'now' | 'events' | 'clocks'
