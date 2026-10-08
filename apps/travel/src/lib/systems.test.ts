import { describe, expect, it } from 'vitest'
import { createSystem, rulesFile } from './newSystem'
import { library, systems } from './packs.svelte'
import { systemDoc } from './systemDoc.svelte'

describe('travel systems in the Travel app', () => {
  it('a new system declares itself, and its forms edit the parts it names', () => {
    const id = createSystem('My Marches')!
    expect(id).toBe('my-marches')
    const system = systems.get(id)!
    expect(system.sources?.system).toMatchObject({ pack: id, id: 'default' })
    const file = rulesFile(system)!
    expect(file).toMatchObject({
      root: id,
      path: 'travel.yaml',
      rulesId: 'default',
      bindings: { path: 'travel.yaml', id: 'default' },
      system: { path: 'system.yaml', id: 'default' },
    })
    const doc = systemDoc(() => file)
    doc.edit('travel-rules', ['travel', 'hoursPerDay'], 6)
    doc.edit('bindings', ['stats', 'luck'], { name: 'Luck', default: 1 })
    const edited = systems.get(id)!
    expect(edited.rules.travel.hoursPerDay).toBe(6)
    expect(edited.bindings?.stats?.luck).toMatchObject({ name: 'Luck', default: 1 })
    expect(library.readFile(id, 'system.yaml')).toContain('travel: default')
  })

  it('bindings added to a declared system are named by it', () => {
    library.addPack({
      root: 'two',
      origin: 'user',
      files: [
        { path: 'pack.yaml', content: 'id: two\nname: Two\nversion: 0.1.0\nlocale: en\n' },
        { path: 'system.yaml', content: 'kind: system\nid: fast\ntravel: fast\n' },
        {
          path: 'travel.yaml',
          content:
            "kind: travel-rules\nday: { start: '06:00', nightfall: '20:00' }\nterrains: { plains: { multiplier: 1 } }\ntravel: { hoursPerDay: 8 }\nmodes: { walk: { kmPerDay: 20 } }\n---\nkind: travel-rules\nid: fast\nday: { start: '06:00', nightfall: '20:00' }\nterrains: { plains: { multiplier: 1 } }\ntravel: { hoursPerDay: 12 }\nmodes: { walk: { kmPerDay: 20 } }\n",
        },
      ],
    })
    const file = rulesFile(systems.get('two/fast')!)!
    expect(file).toMatchObject({ rulesId: 'fast', system: { path: 'system.yaml', id: 'fast' } })
    expect(file.bindings).toBeUndefined()
    const doc = systemDoc(() => file)
    expect(doc.rules).toMatchObject({ travel: { hoursPerDay: 12 } })
    doc.edit('travel-rules', ['travel', 'hoursPerDay'], 10)
    doc.edit('bindings', ['stats', 'luck'], { default: 2 })
    const system = systems.get('two/fast')!
    expect(system.rules.travel.hoursPerDay).toBe(10)
    expect(system.bindings?.stats?.luck).toMatchObject({ default: 2 })
    expect(library.readFile('two', 'system.yaml')).toContain('bindings: default')
  })

  it('the Grey Marches are edited where their system says', () => {
    const marches = systems.get('grey-marches')!
    expect(rulesFile(marches)).toMatchObject({
      path: 'travel.yaml',
      rulesId: 'default',
      bindings: { path: 'travel.yaml', id: 'default' },
      system: { path: 'system.yaml', id: 'default' },
    })
  })
})
