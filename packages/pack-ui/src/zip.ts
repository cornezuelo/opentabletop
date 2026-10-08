import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { manifestOf, MANIFEST_FILE, type PackSource, type WorkspacePack } from './packs'

/** Packs as one .zip, each in its own folder at the top, ready to drop into packs/. */
export function packsToZip(packs: PackSource[]): Uint8Array {
  return zipSync(
    Object.fromEntries(
      packs.flatMap((pack) =>
        pack.files.map((f) => [`${pack.root}/${f.path}`, strToU8(f.content)] as const),
      ),
    ),
  )
}

/**
 * Reads the packs of a .zip: every folder holding a pack.yaml (a pack exported alone, or a
 * system with the packs it brings). A file belongs to the deepest pack folder it is in;
 * only YAML and JSON files are read. Each pack's folder is its manifest id.
 */
export function zipToPacks(data: Uint8Array): PackSource[] {
  const entries = unzipSync(data)
  // In the zip's order (a system's own pack first).
  const bases = Object.keys(entries)
    .filter((p) => p === MANIFEST_FILE || p.endsWith(`/${MANIFEST_FILE}`))
    .map((p) => p.slice(0, -MANIFEST_FILE.length))
  // Deepest first, so a file finds the closest pack folder above it.
  const deepest = [...bases].sort((a, b) => b.length - a.length)
  const files = new Map<string, PackSource['files']>(bases.map((b) => [b, []]))
  for (const [path, bytes] of Object.entries(entries)) {
    if (path.endsWith('/') || !/\.(ya?ml|json)$/.test(path)) continue
    const base = deepest.find((b) => path.startsWith(b))
    if (base !== undefined)
      files.get(base)!.push({ path: path.slice(base.length), content: strFromU8(bytes) })
  }
  return bases.map((base): PackSource => {
    const folder = base.replace(/\/$/, '').split('/').at(-1) || 'pack'
    const pack: PackSource = { root: folder, origin: 'user', files: files.get(base)! }
    return { ...pack, root: manifestOf(pack).id ?? folder }
  })
}

/** What importing packs would do: which are new, which replace a pack, which are already there. */
export interface ImportPlan {
  added: PackSource[]
  /** Packs whose folder already holds a different pack (a user pack, or a bundled one). */
  replaced: PackSource[]
  /** Packs already there file for file (a bundled dependency, say): left as they are. */
  same: PackSource[]
}

const sameFiles = (a: PackSource, b: PackSource) =>
  a.files.length === b.files.length &&
  a.files.every((f) => b.files.find((g) => g.path === f.path)?.content === f.content)

export function planImport(current: WorkspacePack[], incoming: PackSource[]): ImportPlan {
  const plan: ImportPlan = { added: [], replaced: [], same: [] }
  for (const pack of incoming) {
    const there = current.find((p) => p.root === pack.root)
    if (!there) plan.added.push(pack)
    else if (sameFiles(there, pack)) plan.same.push(pack)
    else plan.replaced.push(pack)
  }
  return plan
}

/** Hands the browser a file to save. */
export function download(data: Uint8Array | string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
