import { PackLibrary } from '@open-tabletop/pack-ui'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { Roller, type RollerData, type RollerStore } from './roller.svelte'

const pack = {
  root: 'dice',
  origin: 'user' as const,
  files: [
    { path: 'pack.yaml', content: 'id: dice\nversion: 0.1.0\nlocale: en\n' },
    {
      path: 'tables.yaml',
      content:
        'kind: table\nid: d100\nroll: 1d100\nentries:\n' +
        Array.from({ length: 100 }, (_, i) => `  - { range: ${i + 1}, result: '${i + 1}' }\n`).join(
          '',
        ),
    },
  ],
}

function memoryStore(): RollerStore & { data?: RollerData } {
  const store: RollerStore & { data?: RollerData } = {
    load: () => store.data && structuredClone(store.data),
    save: (data) => void (store.data = structuredClone(data)),
  }
  return store
}

function setup(store = memoryStore()) {
  const library = new PackLibrary([])
  library.addPack(pack)
  const roller = new Roller({ library, store, locale: () => 'en', t: translator(() => 'en') })
  const roll = (times: number) =>
    Array.from({ length: times }, () => {
      roller.run('dice/d100', {})
      return roller.history[0]!.resolution.text
    })
  return { library, roller, roll, store }
}

describe('seeded sessions', () => {
  it('repeat the same rolls from a new session with the same seed', () => {
    const { roller, roll } = setup()
    roller.setSeed('grey marches')
    const first = roll(8)
    roller.resetState()
    expect(roll(8)).toEqual(first)
    // Another seed, other rolls.
    roller.setSeed('another')
    roller.resetState()
    expect(roll(8)).not.toEqual(first)
  })

  it('carry on where they were after a reload', () => {
    const { roller, roll, store } = setup()
    roller.setSeed('42')
    const all = roll(6)
    roller.resetState()
    roll(3)
    // The page reloads: a new Roller reads the store and continues the sequence.
    const again = setup(store)
    expect(again.roller.seed).toBe('42')
    expect(again.roll(3)).toEqual(all.slice(3))
  })

  it('without a seed, roll at random again', () => {
    const { roller, roll, store } = setup()
    roller.setSeed('42')
    roll(1)
    roller.setSeed('  ')
    expect(roller.seed).toBe('')
    roll(1)
    expect(store.data?.random).toBeUndefined()
  })
})
