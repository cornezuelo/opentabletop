import { createOracleEngine, loadPacks, type OracleEngine } from '@open-tabletop/oracle-engine'
import { mathRandom } from '@open-tabletop/random'
import {
  effectivePacks,
  engineFiles,
  manifestOf,
  readUserPacks,
  USER_PACKS_KEY,
  writeUserPacks,
  type PackSource,
  type WorkspacePack,
} from './packs'

/**
 * The packs an app sees: the ones it bundles plus the user packs stored in this browser
 * (shared by every OpenTabletop app on the same origin), compiled into one registry.
 * Changes made in another tab (e.g. the Oracle app) show up live.
 */
export class PackLibrary {
  /** Never changes after construction. */
  private bundled: PackSource[] = []
  user = $state.raw<PackSource[]>([])
  packs: WorkspacePack[] = $derived(effectivePacks(this.bundled, this.user))
  loaded = $derived(loadPacks(engineFiles(this.packs)))
  registry = $derived(this.loaded.registry)
  engine: OracleEngine = $derived(
    createOracleEngine({ registry: this.registry, random: mathRandom() }),
  )

  constructor(bundled: PackSource[]) {
    this.bundled = bundled
    this.user = readUserPacks()
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key === USER_PACKS_KEY) this.user = readUserPacks()
      })
  }

  pack(root: string): WorkspacePack | undefined {
    return this.packs.find((p) => p.root === root)
  }

  /** Folder of the pack with that manifest id. */
  rootOf(packId: string): string | undefined {
    return this.packs.find((p) => manifestOf(p).id === packId)?.root
  }

  /** Replaces the user packs; returns false if they couldn't be saved (storage full). */
  setUserPacks(user: PackSource[]): boolean {
    this.user = user
    return writeUserPacks(user)
  }
}
