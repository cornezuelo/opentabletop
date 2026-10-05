/** Short random id; doesn't need crypto.randomUUID (unavailable outside secure contexts). */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
