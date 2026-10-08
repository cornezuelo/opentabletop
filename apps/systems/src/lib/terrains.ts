import { en } from './i18n/en'
import { t, type MessageKey } from './i18n'

/** Terrain ids of the Hexmapper's default palette, suggested in any system's rules. */
export const PALETTE = Object.keys(en.terrains)

export const terrainName = (id: string): string =>
  id in en.terrains ? t(`terrains.${id}` as MessageKey) : id.replaceAll('-', ' ')

export const edgeName = (id: string): string =>
  id in en.edgeKinds ? t(`edgeKinds.${id}` as MessageKey) : id.replaceAll('-', ' ')
