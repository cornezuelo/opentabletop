/**
 * Campaigns: the world shared by maps (the world clock, its weather, the factions' sheets,
 * the Oracle state), apart from the place (a map, which keeps the land each faction holds
 * on it). Plain TypeScript, so every app reads and writes campaigns the same way; storage
 * is the apps' (`@open-tabletop/storage`). See docs/campaigns.md.
 */
export * from './types'
export * from './serialize'
export * from './factions'
export * from './world'
export * from './trips'
