import { CURRENT_VERSION } from './defaults'

/**
 * `migrations[n]` upgrades raw data from version n to n + 1. Every format change
 * bumps CURRENT_VERSION and adds an entry here.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {}

export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let version = typeof data.version === 'number' ? data.version : 0
  if (version > CURRENT_VERSION) throw new MapFormatError('newerVersion')
  while (version < CURRENT_VERSION) {
    const step = migrations[version]
    if (!step) throw new MapFormatError('invalid')
    data = { ...step(data), version: version + 1 }
    version++
  }
  return data
}

export type MapFormatErrorCode = 'invalid' | 'newerVersion'

export class MapFormatError extends Error {
  constructor(public code: MapFormatErrorCode) {
    super(`Map format error: ${code}`)
  }
}
