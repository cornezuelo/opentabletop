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
    farmland: { multiplier: 1 },
    desert: { multiplier: 0.75 },
    forest: { multiplier: 0.5 },
    taiga: { multiplier: 0.5 },
    tundra: { multiplier: 0.5 },
    hills: { multiplier: 0.5 },
    badlands: { multiplier: 0.5 },
    snow: { multiplier: 0.5 },
    swamp: { multiplier: 0.33 },
    mountains: { multiplier: 0.33 },
    jungle: { multiplier: 0.33 },
    volcanic: { multiplier: 0.33 },
    heath: { multiplier: 0.75 },
    savanna: { multiplier: 1 },
    'dense-forest': { multiplier: 0.33 },
    marsh: { multiplier: 0.33 },
    peaks: { multiplier: 0.25 },
    canyon: { multiplier: 0.5 },
    oasis: { multiplier: 1 },
    glacier: { multiplier: 0.25 },
    coast: { multiplier: 1 },
    // Modern, post-apocalyptic and sci-fi terrains (the Hexmapper's terrain sets).
    city: { multiplier: 1 },
    suburbs: { multiplier: 1 },
    industrial: { multiplier: 0.75 },
    ruins: { multiplier: 0.5 },
    wasteland: { multiplier: 0.75 },
    irradiated: { multiplier: 0.5 },
    'toxic-swamp': { multiplier: 0.33 },
    crater: { multiplier: 0.5 },
    'alien-jungle': { multiplier: 0.33 },
    'crystal-field': { multiplier: 0.5 },
    'lava-field': { passable: false },
    regolith: { multiplier: 0.75 },
    // Open space and nebulae are for ships: a system with a mode `allowedTerrains: [space…]`.
    space: { passable: false },
    nebula: { passable: false },
    'asteroid-field': { passable: false },
    // A lake is crossed on the ice in winter (passable as a condition), never otherwise.
    lake: { passable: { when: { season: 'winter' } } },
    sea: { passable: false },
    'deep-sea': { passable: false },
  },
  water: { passable: false },
  edges: { road: { multiplier: 1.5 }, trail: { multiplier: 1.2 } },
  modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 50 } },
  // Food never goes below 0: when there's none left, eating hits that minimum.
  resources: { food: { min: 0 } },
  checks: [],
  // No values of the day: nothing here blocks travel.
  values: {},
  // Camp sleeps until dawn; a rest is an hour without marching. As each day ends, whether
  // the party camped or not, it eats a day of food (an action the system takes by itself).
  actions: {
    camp: { do: [{ time: 'dawn' }] },
    rest: { do: [{ time: 60 }] },
    eat: { on: 'day-end', do: [{ effects: { 'party.resources.food': -1 } }] },
  },
}
