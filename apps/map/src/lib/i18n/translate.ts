import type { MessageKey, Messages } from './types'

/** Resolves a dotted key and replaces `{name}` placeholders with `params`. */
export function translate(
  messages: Messages,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let node: unknown = messages
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part]
  if (typeof node !== 'string') return key
  if (!params) return node
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
