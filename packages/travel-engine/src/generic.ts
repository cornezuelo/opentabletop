import type { TravelRules } from './rules'

/**
 * System-agnostic defaults for maps without a system pack. Terrain ids match the
 * hexmapper's default palette; unknown terrains move at normal speed.
 */
export const genericTravelRules: TravelRules = {
  id: 'generic',
  day: { start: '06:00', nightfall: '20:00' },
  travel: { hoursPerDay: 8 },
  terrains: {
    steppe: { multiplier: 1 },
    plains: { multiplier: 1 },
    desert: { multiplier: 0.75 },
    forest: { multiplier: 0.5 },
    hills: { multiplier: 0.5 },
    badlands: { multiplier: 0.5 },
    snow: { multiplier: 0.5 },
    swamp: { multiplier: 0.33 },
    mountains: { multiplier: 0.33 },
    lake: { passable: false },
    sea: { passable: false },
  },
  edges: { road: { multiplier: 1.5 }, trail: { multiplier: 1.2 } },
  modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 50 } },
  resources: { food: { perDay: 1 } },
  checks: [],
}
