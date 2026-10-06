import {
  createOracleEngine,
  loadPacks,
  type Diagnostic,
  type OracleEngine,
} from '@open-tabletop/oracle-engine'
import { mathRandom } from '@open-tabletop/random'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from '../i18n'
import { bundledPacks } from './bundled'
import {
  effectivePacks,
  engineFiles,
  manifestOf,
  MANIFEST_FILE,
  type PackSource,
  type WorkspacePack,
} from './workspace'

/**
 * User packs are stored in the browser under an ecosystem-wide key, so apps served from
 * the same origin (hexmapper, oracle…) see the same packs.
 */
const STORAGE = 'opentabletop.userPacks'

function loadUser(): PackSource[] {
  try {
    const raw = localStorage.getItem(STORAGE)
    const parsed = raw ? (JSON.parse(raw) as PackSource[]) : []
    return Array.isArray(parsed) ? parsed.map((p) => ({ ...p, origin: 'user' as const })) : []
  } catch {
    return []
  }
}

class Workspace {
  user = $state.raw<PackSource[]>(loadUser())
  packs: WorkspacePack[] = $derived(effectivePacks(bundledPacks, this.user))
  loaded = $derived(loadPacks(engineFiles(this.packs)))
  registry = $derived(this.loaded.registry)
  engine: OracleEngine = $derived(
    createOracleEngine({ registry: this.registry, random: mathRandom() }),
  )

  pack(root: string): WorkspacePack | undefined {
    return this.packs.find((p) => p.root === root)
  }

  /** Folder of the pack with that manifest id. */
  rootOf(packId: string): string | undefined {
    return this.packs.find((p) => manifestOf(p).id === packId)?.root
  }

  /** Engine diagnostics of a pack (by folder), optionally of one file. */
  diagnostics(root: string, file?: string): Diagnostic[] {
    const id = manifestOf(this.pack(root) ?? { root, origin: 'user', files: [] }).id
    const prefix = `${root}/`
    return this.loaded.diagnostics.filter((d) =>
      file
        ? d.file === `${root}/${file}`
        : d.file?.startsWith(prefix) || (d.pack !== undefined && d.pack === id),
    )
  }

  isEditable(root: string): boolean {
    return this.pack(root)?.origin === 'user'
  }

  private save(user: PackSource[]): void {
    this.user = user
    try {
      localStorage.setItem(STORAGE, JSON.stringify(user))
    } catch {
      showToast(t('storage.full'), 'error', 8000)
    }
  }

  private update(root: string, change: (pack: PackSource) => PackSource): void {
    this.save(this.user.map((p) => (p.root === root ? change(p) : p)))
  }

  addPack(pack: PackSource): void {
    this.save([...this.user.filter((p) => p.root !== pack.root), { ...pack, origin: 'user' }])
  }

  /** Copies a bundled pack into the user's packs, overriding it. */
  editCopy(root: string): void {
    const pack = this.pack(root)
    if (!pack || pack.origin === 'user') return
    this.addPack({ ...pack, origin: 'user', files: pack.files.map((f) => ({ ...f })) })
  }

  /** Deletes a user pack (for an edited bundled pack, this reverts to the bundled one). */
  removePack(root: string): void {
    this.save(this.user.filter((p) => p.root !== root))
  }

  readFile(root: string, path: string): string | undefined {
    return this.pack(root)?.files.find((f) => f.path === path)?.content
  }

  writeFile(root: string, path: string, content: string): void {
    this.update(root, (p) => ({
      ...p,
      files: p.files.some((f) => f.path === path)
        ? p.files.map((f) => (f.path === path ? { path, content } : f))
        : [...p.files, { path, content }].sort((a, b) => a.path.localeCompare(b.path)),
    }))
  }

  renameFile(root: string, from: string, to: string): void {
    if (from === MANIFEST_FILE) return
    this.update(root, (p) => ({
      ...p,
      files: p.files.map((f) => (f.path === from ? { ...f, path: to } : f)),
    }))
  }

  deleteFile(root: string, path: string): void {
    if (path === MANIFEST_FILE) return
    this.update(root, (p) => ({ ...p, files: p.files.filter((f) => f.path !== path) }))
  }
}

export const workspace = new Workspace()
