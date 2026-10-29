import type { SystemFactions } from '@open-tabletop/session'

/** A faction's colour, as its system declares it (a neutral one when it declares none). */
export const factionColor = (system: SystemFactions | undefined, id: string): string =>
  system?.def.factions[id]?.color ?? '#8a7f6e'
