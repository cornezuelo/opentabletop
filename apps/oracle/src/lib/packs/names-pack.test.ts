import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { passesFilter } from '@open-tabletop/oracle-ui'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'
import { engineFiles } from './workspace'

describe('the Names pack', () => {
  const { registry } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))
  const names = [...registry.definitions.values()].filter((d) => d.pack === 'names')
  const engine = createOracleEngine({ registry, random: seeded('names') })
  const roll = (id: string, context = {}, locale = 'en') =>
    engine.resolve(`names/${id}`, context, undefined, { locale }).resolution.text ?? ''
  const many = (id: string, context = {}, locale = 'en') =>
    Array.from({ length: 60 }, () => roll(id, context, locale))

  it('tags everything as names, and by what it names', () => {
    expect(names.length).toBeGreaterThan(20)
    for (const d of names) expect(d.tags, d.id).toContain('names')
    const only = (tag: string) =>
      names.filter((d) => passesFilter(d, { kinds: [], tags: { [tag]: 'only' } })).map((d) => d.id)
    expect(only('inns')).toEqual(
      expect.arrayContaining(['names/place', 'names/inn', 'names/inn-sign']),
    )
    expect(only('sci-fi')).not.toContain('names/person-north')
  })

  it('names someone of the folk chosen, or of any', () => {
    expect(roll('person', { folk: 'fair' })).toMatch(/^\S+ of House [A-Z]/)
    expect(roll('person', { folk: 'modern' })).toMatch(/^\S+ \S+$/)
    expect(new Set(many('person', { folk: 'any' })).size).toBeGreaterThan(40)
  })

  it("gives a northern child their father's name for a son or a daughter", () => {
    const sons = ['Arne', 'Bjorn', 'Eirik', 'Ingvar', 'Leif', 'Sven', 'Ulf']
    for (const name of many('person-north')) {
      const [given, family] = name.split(' ')
      expect(family, name).toMatch(sons.includes(given) ? /sson$/ : /sdottir$/)
    }
    // Now and then a byname, never always.
    const bynames = many('person-north').filter((n) => n.split(' ').length > 2)
    expect(bynames.length).toBeGreaterThan(0)
    expect(bynames.length).toBeLessThan(30)
  })

  it("fits a landmark to the hex's terrain, and to anywhere by hand", () => {
    const forest = many('landmark', { hex: { terrain: 'forest' } })
    expect(forest.some((n) => /^The (Wood|Holt) /.test(n))).toBe(true)
    expect(forest.some((n) => /^The (Tor|Fen|Cove) /.test(n))).toBe(false)
    expect(many('landmark').some((n) => /^The (Wood|Holt|Tor|Fen) /.test(n))).toBe(false)
  })

  it('names places in Spanish with their words in agreement', () => {
    const inns = many('inn', {}, 'es')
    expect(inns.every((n) => /^(El|La|Las) /.test(n))).toBe(true)
    expect(inns.some((n) => / y (el|la) /.test(n))).toBe(true)
    expect(many('landmark', {}, 'es').every((n) => / (de|del) /.test(n))).toBe(true)
    // Made-up names stay as they are.
    expect(roll('place', { what: 'world' }, 'es')).toMatch(/^\S+( Ish\S*)? [IVX]+$/)
  })
})
