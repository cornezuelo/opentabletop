import type { PackSource } from './workspace'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones from
 * packs-private/ (git-ignored; the glob is simply empty when it's missing).
 */
const open = import.meta.glob('../../../../../packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const personal = import.meta.glob('../../../../../packs-private/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function group(files: Record<string, string>, folder: string, isPersonal: boolean): PackSource[] {
  const packs = new Map<string, PackSource>()
  for (const [fullPath, content] of Object.entries(files)) {
    const relative = fullPath.split(`/${folder}/`)[1]
    if (!relative) continue
    const [root, ...rest] = relative.split('/')
    if (!rest.length) continue
    if (!packs.has(root))
      packs.set(root, { root, origin: 'bundled', personal: isPersonal || undefined, files: [] })
    packs.get(root)!.files.push({ path: rest.join('/'), content })
  }
  return [...packs.values()].filter((p) => p.files.some((f) => f.path === 'pack.yaml'))
}

export const bundledPacks: PackSource[] = [
  ...group(open, 'packs', false),
  ...group(personal, 'packs-private', true),
]
