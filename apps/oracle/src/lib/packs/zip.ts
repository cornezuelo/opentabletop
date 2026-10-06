import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { manifestOf, MANIFEST_FILE, type PackSource } from './workspace'

/** A pack as a .zip with its folder at the top, ready to drop into packs/. */
export function packToZip(pack: PackSource): Uint8Array {
  return zipSync(
    Object.fromEntries(pack.files.map((f) => [`${pack.root}/${f.path}`, strToU8(f.content)])),
  )
}

/** Reads a pack from a .zip: the folder holding the shallowest pack.yaml. */
export function zipToPack(data: Uint8Array): PackSource | null {
  const entries = unzipSync(data)
  const manifests = Object.keys(entries)
    .filter((p) => p === MANIFEST_FILE || p.endsWith(`/${MANIFEST_FILE}`))
    .sort((a, b) => a.split('/').length - b.split('/').length)
  if (!manifests.length) return null
  const base = manifests[0].slice(0, -MANIFEST_FILE.length)
  const files = Object.entries(entries)
    .filter(([p]) => p.startsWith(base) && /\.(ya?ml|json)$/.test(p) && !p.endsWith('/'))
    .map(([p, bytes]) => ({ path: p.slice(base.length), content: strFromU8(bytes) }))
  const folder = base.replace(/\/$/, '').split('/').at(-1)
  const pack: PackSource = { root: folder || 'pack', origin: 'user', files }
  const id = manifestOf(pack).id
  return { ...pack, root: id ?? pack.root }
}

export function download(data: Uint8Array | string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
