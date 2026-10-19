import type { Campaign } from './types'

/**
 * A map or a trip moving to another campaign (campaigns.md §5). What it brings of its own
 * (a world clock, factions, Oracle state) either stays behind (`theirs`: the campaign it
 * joins keeps its world) or comes along (`mine`: it takes the place of that campaign's).
 */
export type WhatStays = 'theirs' | 'mine'

const isEmpty = (record: object | undefined) => !record || !Object.keys(record).length

/** Whether a campaign's world has anything in it: a clock, its weather, factions, Oracle state. */
export function hasWorld(campaign: Campaign): boolean {
  const { world, worldWeather, factions, oracle } = campaign
  if (world || worldWeather || factions) return true
  if (!oracle) return false
  const { decks, occurrences, vars } = oracle.state
  return !!oracle.history.length || !isEmpty(decks) || !isEmpty(occurrences) || !isEmpty(vars)
}

/** The parts of a world a place brings along (`mine`), its system and packs among them. */
const WORLD_PARTS = ['system', 'packs', 'world', 'worldWeather', 'factions', 'oracle'] as const

/**
 * The campaign `to` once a place coming from `from` joins it: as it is (`theirs`), or with
 * `from`'s world, system and packs in place of its own (`mine`). Its name, note and the trip
 * going on are always `to`'s. Whether to ask: `hasWorld(from)` (nothing to bring otherwise).
 */
export function joinCampaign(from: Campaign, to: Campaign, stays: WhatStays): Campaign {
  if (stays === 'theirs') return to
  const next: Campaign = { ...to }
  for (const part of WORLD_PARTS) {
    if (from[part] === undefined) delete next[part]
    else (next as unknown as Record<string, unknown>)[part] = structuredClone(from[part])
  }
  return next
}

/**
 * The land a map keeps in the campaign it joined: that of the factions the campaign has (a
 * faction of the map's old world that isn't in it holds nothing there).
 */
export function landIn(
  campaign: Campaign,
  territories: Record<string, string[]> | undefined,
): Record<string, string[]> | undefined {
  if (!territories) return undefined
  const ids = new Set(campaign.factions?.factions.map((f) => f.id) ?? [])
  const land: Record<string, string[]> = {}
  for (const [id, hexes] of Object.entries(territories)) if (ids.has(id)) land[id] = hexes
  return Object.keys(land).length ? land : undefined
}
