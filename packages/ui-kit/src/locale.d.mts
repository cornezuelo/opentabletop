export function pickLocale<L extends string>(
  stored: unknown,
  languages: readonly string[] | undefined,
  available: readonly L[],
  fallback: L,
): L
export function initialLocale<L extends string>(
  keys: readonly string[],
  available: readonly L[],
  fallback: L,
): L
