import { describe, expect, it } from 'vitest'
import {
  createPart,
  createSystem,
  declareSystem,
  partChoices,
  rulesFile,
  systemFile,
} from './newSystem'
import { library, systems } from './packs.svelte'
import { systemDoc } from './systemDoc.svelte'

describe('systems in the Systems app', () => {
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

  it("a system's overview edits its own definition: name in two languages, parts, packs", () => {
    const marches = systems.get('grey-marches')!
    expect(systemFile(marches)).toMatchObject({
      root: 'grey-marches',
      system: { path: 'system.yaml', id: 'default' },
    })
    // What it can name: its own parts by id, its dependency's as pack/id.
    expect(partChoices(marches, 'travel-rules')).toEqual(['default'])
    expect(partChoices(marches, 'calendar')).toContain('marcher-reckoning')
    expect(partChoices(marches, 'weather')).toContain('sky')
    library.editCopy('grey-marches')
    const doc = systemDoc(() => systemFile(systems.get('grey-marches')!)!)
    expect(doc.system).toMatchObject({ travel: 'default', packs: ['core'] })
    doc.setText('system', ['name'], doc.system!.name, ['name'], 'The Grey Marches, revised')
    doc.edit('system', ['packs'], undefined)
    const edited = systems.get('grey-marches')!
    // The base language is written; its Spanish translation stays.
    expect(edited.name).toEqual({ en: 'The Grey Marches, revised', es: 'Las Marcas Grises' })
    expect(edited.packs).toEqual(['grey-marches'])
    // Without a calendar the system uses the default one.
    doc.edit('system', ['calendar'], undefined)
    expect(systems.get('grey-marches')!.calendar).toBeUndefined()
    library.undo()
    expect(systems.get('grey-marches')!.calendar).toBeDefined()
    library.removePack('grey-marches')
  })

  it('a declared system without travel rules or bindings gets new ones in one step', () => {
    library.addPack({
      root: 'bare',
      origin: 'user',
      files: [
        { path: 'pack.yaml', content: 'id: bare\nname: Bare\nversion: 0.1.0\nlocale: en\n' },
        { path: 'system.yaml', content: 'kind: system\nid: default\nname: Bare\n' },
      ],
    })
    expect(rulesFile(systems.get('bare')!)).toBeNull()
    expect(createPart(systems.get('bare')!, 'travel-rules')).toBe('default')
    expect(createPart(systems.get('bare')!, 'bindings')).toBe('default')
    const system = systems.get('bare')!
    expect(system.sources?.rules).toMatchObject({ pack: 'bare', file: 'bare/travel.yaml' })
    expect(system.sources?.bindings).toMatchObject({ pack: 'bare', id: 'default' })
    expect(library.readFile('bare', 'system.yaml')).toMatch(
      /travel: default[\s\S]*bindings: default/,
    )
    // Undo takes the bindings back, file and name together.
    library.undo()
    expect(systems.get('bare')!.sources?.bindings).toBeUndefined()
    expect(library.readFile('bare', 'system.yaml')).not.toContain('bindings')
  })

  it("an older pack's implicit system is declared as it plays", () => {
    library.addPack({
      root: 'old',
      origin: 'user',
      files: [
        { path: 'pack.yaml', content: 'id: old\nname: Old\nversion: 0.1.0\nlocale: en\n' },
        {
          path: 'rules.yaml',
          content:
            "kind: travel-rules\nday: { start: '06:00', nightfall: '20:00' }\nterrains: { plains: { multiplier: 1 } }\ntravel: { hoursPerDay: 7 }\nmodes: { walk: { kmPerDay: 20 } }\n---\nkind: bindings\non: {}\n",
        },
      ],
    })
    const before = systems.get('old')!
    expect(before.sources?.system).toBeUndefined()
    expect(systemFile(before)).toBeNull()
    expect(declareSystem(before)).toBe(true)
    const after = systems.get('old')!
    expect(after.sources?.system).toMatchObject({ pack: 'old', file: 'old/system.yaml' })
    expect(after.rules.travel.hoursPerDay).toBe(7)
    expect(library.readFile('old', 'system.yaml')).toMatch(
      /travel: default[\s\S]*bindings: default/,
    )
  })
})
