/**
 * The game system last chosen in Travel, Systems or the Oracle: a preference of this
 * browser, so the next app opened starts on the same system. The Hexmapper doesn't use it
 * (each map has its own system).
 */
export const LAST_SYSTEM_KEY = 'opentabletop.lastSystem'

export function readLastSystem(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): string | undefined {
  try {
    return storage?.getItem(LAST_SYSTEM_KEY) || undefined
  } catch {
    return undefined
  }
}

export function rememberSystem(
  id: string,
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(LAST_SYSTEM_KEY, id)
  } catch {
    // Not remembered; nothing else depends on it.
  }
}
