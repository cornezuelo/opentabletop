import { loadPacks, type PackFile } from '@open-tabletop/oracle-engine'
import { travelSystems, type TravelSystem } from './trip'

/** For tests: the bundled Core pack's files (`packs/core`), as an app loads them. */
// Vite's glob (Vitest's too): typed where an app has vite/client, not in this core.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- `import.meta.glob` is Vite's; this file only runs under Vitest.
const core: Record<string, unknown> = import.meta.glob('../../../packs/core/**/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const corePack = (): PackFile[] =>
  Object.entries(core).map(([path, content]) => ({
    path: path.slice(path.indexOf('core/')),
    content: content as string,
  }))

/** For tests: Core's system, the Generic rules, as the apps load it. */
export function coreSystem(): TravelSystem {
  const { registry } = loadPacks(corePack())
  return travelSystems(registry).systems.find((s) => s.id === 'core')!
}
