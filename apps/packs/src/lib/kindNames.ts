import { t, type MessageKey } from './i18n'

/** What a kind's definitions are called, together (`table` → Tables); any other, its id. */
export function kindName(kind: string): string {
  const key = `library.kindNames.${kind}` as MessageKey
  const name = t(key)
  return name === key ? kind : name
}
