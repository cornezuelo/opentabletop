const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Random URL- and filename-safe id. Uses crypto.getRandomValues, which (unlike
 * crypto.randomUUID) also works outside secure contexts, e.g. over plain http on a LAN.
 */
export function newId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{6,32}$/.test(value)
}
