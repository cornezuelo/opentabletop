import { describe, expect, it } from 'vitest'
import { contextOf, run, type Io } from './cli'

const pack = [
  { path: 'mine/pack.yaml', content: 'id: mine\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'mine/t.yaml',
    content: `kind: table
id: weather
name: Weather
roll: 1d6
entries:
  - { id: rain, range: 1-3, result: Rain, when: { season: autumn } }
  - { id: sun, range: 1-6, result: Sun }
---
kind: table
id: broken
roll: 1d6
entries:
  - { range: 1-3, result: A }
  - { range: 2-6, result: B }
`,
  },
]

function io(folders: Record<string, typeof pack>) {
  const out: string[] = []
  const err: string[] = []
  const fake: Io = {
    readFolder: (path) => folders[path] ?? null,
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
  }
  return { fake, out, err }
}

describe('the command line', () => {
  it('validates packs and fails on errors', () => {
    const { fake, out } = io({ packs: pack })
    expect(run(['validate'], fake)).toBe(1)
    expect(out.join('\n')).toMatch(/overlap/)
    expect(out.at(-1)).toBe('1 packs, 2 definitions: 1 errors, 0 warnings')
  })

  it('lists and rolls, with context, a seed and several times', () => {
    const { fake, out } = io({ here: pack })
    expect(run(['list', '--packs', 'here'], fake)).toBe(0)
    expect(out[0]).toBe('mine/broken\ttable\t')
    out.length = 0
    expect(
      run(
        ['roll', 'weather', 'season=autumn', '--packs', 'here', '--seed', 'x', '--times', '3'],
        fake,
      ),
    ).toBe(0)
    expect(out).toHaveLength(3)
    for (const line of out) expect(line).toMatch(/^(Rain|Sun) {2}\[1d6 = \d\]$/)
    const again = io({ here: pack })
    run(
      ['roll', 'mine/weather', 'season=autumn', '--packs', 'here', '--seed', 'x', '--times', '3'],
      again.fake,
    )
    expect(again.out).toEqual(out)
  })

  it('says what went wrong', () => {
    const { fake, err } = io({})
    expect(run(['roll', 'x', '--packs', 'nowhere'], fake)).toBe(2)
    expect(err[0]).toBe('No such folder: nowhere')
    expect(run(['dance'], io({}).fake)).toBe(2)
    expect(run([], io({}).fake)).toBe(2)
  })

  it('reads context values like the roll panel', () => {
    expect(
      contextOf(['danger=3', 'night=true', 'party.stats.morale=-1', 'terrain=forest']),
    ).toEqual({
      danger: 3,
      night: true,
      party: { stats: { morale: -1 } },
      terrain: 'forest',
    })
  })
})
