import { loadPacks } from '@open-tabletop/oracle-engine'
import { engineFiles, packsToZip, planImport, zipToPacks } from '@open-tabletop/pack-ui'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import {
  createPart,
  createSystem,
  createSystemPart,
  declareSystem,
  genericYaml,
  olderFormatChecks,
  packFormat,
  partChoices,
  partName,
  rulesFile,
  systemFile,
  systemParts,
  updateFormat,
} from './newSystem'
import { renameMonth } from './calendar'
import { partDoc } from './partDoc.svelte'
import { library, systems } from './packs.svelte'
import { systemDoc } from './systemDoc.svelte'
import { importedSystem, staleCopies, systemZipPacks } from './transfer'
import { fingerprints } from '@open-tabletop/pack-ui'

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

  it('a pack of an older format is updated keeping what it does', () => {
    // New systems are written for today's format.
    expect(packFormat(createSystem('Fresh')!)).toBe(2)
    library.addPack({
      root: 'aged',
      origin: 'user',
      files: [
        { path: 'pack.yaml', content: 'id: aged\nname: Aged\nversion: 0.1.0\nlocale: en\n' },
        {
          path: 'travel.yaml',
          content:
            "kind: travel-rules\nday: { start: '06:00', nightfall: '20:00' }\nterrains: { plains: { multiplier: 1 } }\ntravel: { hoursPerDay: 8 }\nmodes: { walk: { kmPerDay: 20 } }\nchecks:\n  - { event: LANDMARK, at: hex-enter }\n  - { event: TIRED, at: day-end, effects: { party.stats.fatigue: 1 } }\n",
        },
      ],
    })
    expect(packFormat('aged')).toBe(1)
    // Format 1: the tableless check without effects pauses (read so, and played so).
    expect(systems.get('aged')!.rules.checks!.map((c) => c.pause)).toEqual([true, undefined])
    const doc = systemDoc(() => rulesFile(systems.get('aged')!)!)
    expect(olderFormatChecks(doc.rules, doc.bindings)).toEqual([0])
    updateFormat(doc)
    expect(packFormat('aged')).toBe(2)
    expect(library.readFile('aged', 'pack.yaml')).toContain('format: 2')
    expect(library.readFile('aged', 'travel.yaml')).toContain('pause: true')
    // It plays the same, now in today's syntax; one undo takes it all back.
    expect(systems.get('aged')!.rules.checks!.map((c) => c.pause)).toEqual([true, undefined])
    library.undo()
    expect(packFormat('aged')).toBe(1)
    expect(library.readFile('aged', 'travel.yaml')).not.toContain('pause')
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

  it('every bundled system declares itself, and its overview names its parts', () => {
    const bundled = systems.list.filter((s) => s.pack && library.pack(s.pack)?.origin === 'bundled')
    expect(bundled.map((s) => s.id)).toContain('grey-marches')
    // None plays as an older pack's implicit system (Kal-Arath too, when its pack is here).
    for (const system of bundled) expect(system.sources?.system, system.id).toBeDefined()
    const marches = systems.get('grey-marches')!
    expect(partName(marches, 'calendar', 'marcher-reckoning')).toBe('The Marcher reckoning')
    expect(partName(marches, 'weather', 'sky')).toBe("The Marches' sky")
    expect(partName(marches, 'travel-rules', 'default')).toBeUndefined()
    const kalArath = systems.get('kal-arath')
    if (kalArath) {
      expect(kalArath.rules.actions?.camp).toMatchObject({ do: [{ time: 'dawn' }] })
      expect(kalArath.rules.actions?.rest).toBe(false)
    }
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

  it('shows the Generic rules as a pack would write them, and they load as one', () => {
    const { registry, diagnostics } = loadPacks([
      {
        path: 'g/pack.yaml',
        content: 'id: g\nname: G\nversion: 0.1.0\nlocale: en\nlicense: MIT\n',
      },
      { path: 'g/rules.yaml', content: genericYaml() },
    ])
    expect(diagnostics.map((d) => d.message)).toEqual([])
    const { systems: found, problems } = travelSystems(registry)
    expect(problems).toEqual([])
    const g = found.find((s) => s.id === 'g')!
    expect(g.rules.travel.hoursPerDay).toBe(systems.get('generic')!.rules.travel.hoursPerDay)
    expect(Object.keys(g.rules.terrains)).toEqual(
      Object.keys(systems.get('generic')!.rules.terrains),
    )
  })

  it('a copy of a pack a system uses, older than the bundled one, is named on the system', () => {
    // A copy of Core made before it had factions: it replaces the whole bundled Core.
    const core = library.bundledPack('core')!
    const old = { ...core, files: core.files.filter((f) => !f.path.endsWith('factions.yaml')) }
    library.addPack({ ...old, basedOn: fingerprints(old) })
    const marches = () => systems.get('grey-marches')!
    const missing = () =>
      library
        .diagnostics('grey-marches', 'factions.yaml')
        .filter((d) => d.message.includes('core/faction-turn'))
    expect(missing()).toHaveLength(1)
    expect(staleCopies(marches())).toEqual(['core'])
    // Taking the bundled pack's new files brings the table back.
    library.updateFromBundled('core', { take: library.bundledChanges('core').map((c) => c.path) })
    expect(missing()).toEqual([])
    expect(staleCopies(marches())).toEqual([])
    library.removePack('core')
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

  it("a system's calendar, weather and roll modes are found and edited in forms", () => {
    const marches = systems.get('grey-marches')!
    expect(systemParts(marches, 'calendar')).toEqual([
      { root: 'grey-marches', path: 'calendar.yaml', kind: 'calendar', id: 'marcher-reckoning' },
    ])
    expect(systemParts(marches, 'weather').map((p) => p.id)).toEqual(['sky'])
    // Roll modes of the packs it brings: its own, then Core's.
    expect(systemParts(marches, 'roll-modes').map((p) => `${p.root}/${p.id}`)).toEqual([
      'grey-marches/default',
      'core/default',
    ])
    library.editCopy('grey-marches')
    const calendar = partDoc(() => systemParts(systems.get('grey-marches')!, 'calendar')[0])
    expect(calendar.editable).toBe(true)
    // A month renamed: its Spanish name and its holiday follow it; a longer month changes the year.
    expect(renameMonth(calendar, 0, 'sowing')).toBe(false)
    expect(renameMonth(calendar, 0, 'melt')).toBe(true)
    expect(calendar.data().holidays).toContainEqual(
      expect.objectContaining({ id: 'first-thaw', month: 'melt' }),
    )
    calendar.edit('', ['months', 0, 'days'], 31)
    expect(library.readFile('grey-marches', 'locales/es/calendar.yaml')).toContain('melt:')
    const months = systems.get('grey-marches')!.calendar!.describe(30 * 24 * 60).month
    expect(months).toMatchObject({ id: 'melt', day: 31 })
    // Moving a weekday keeps the rest in order.
    calendar.move('', ['weekdays'], 0, 1)
    expect((calendar.data().weekdays as { id: string }[]).slice(0, 2).map((d) => d.id)).toEqual([
      'ironday',
      'moonday',
    ])
    // A weather weight, written where the form puts it.
    const sky = partDoc(() => systemParts(systems.get('grey-marches')!, 'weather')[0])
    sky.edit('', ['seasons', 'summer', 'next', 'clear', 'storm'], 3)
    const summer = systems.get('grey-marches')!.weather?.['grey-marches/sky'].seasons.summer
    expect(summer && 'next' in summer && summer.next.clear).toMatchObject({ storm: 3 })
    // A cell of the winter's hex flower.
    sky.edit('', ['seasons', 'winter', 'flower', 'rows', 0, 0], 'snow')
    const winter = systems.get('grey-marches')!.weather?.['grey-marches/sky'].seasons.winter
    expect(winter && 'flower' in winter && winter.flower.rows[0][0]).toBe('snow')
    library.removePack('grey-marches')
    // Every read after a change reloads the packs: a few seconds in all.
  }, 30_000)

  it('a new calendar, weather model and roll modes are created and named by the system', () => {
    const id = createSystem('Weathered')!
    const system = () => systems.get(id)!
    expect(systemParts(system(), 'calendar')).toEqual([])
    expect(createSystemPart(system(), 'calendar')).toBe('calendar')
    expect(createSystemPart(system(), 'weather')).toBe('weather')
    expect(createSystemPart(system(), 'weather')).toBe('weather-2')
    expect(createSystemPart(system(), 'roll-modes')).toBe('default')
    expect(system().calendar).toBeDefined()
    expect(Object.keys(system().weather ?? {})).toEqual([`${id}/weather`, `${id}/weather-2`])
    expect(systemParts(system(), 'roll-modes').map((p) => p.root)).toEqual([id])
    expect(library.readFile(id, 'system.yaml')).toMatch(/calendar: calendar[\s\S]*weather:/)
    // The system uses the new calendar's seasons.
    expect(system().calendar!.describe(0).month.id).toBe('thaw')
    // New factions come with a sheet of their own, and are named by the system.
    expect(createSystemPart(system(), 'factions')).toBe('default')
    expect(system().factions?.sheet.id).toBe(`${id}/faction`)
    expect(Object.keys(system().factions!.def.factions)).toEqual(['the-crown', 'the-rebels'])
    expect(library.readFile(id, 'system.yaml')).toMatch(/factions: default/)
    // Every read after a change reloads the packs: a few seconds in all.
  }, 30_000)

  it('a system goes elsewhere whole: its .zip holds every pack it needs', () => {
    const marches = systems.get('grey-marches')!
    const packs = systemZipPacks(marches)
    // Its own pack first, then Core (it brings Core's tables and depends on it).
    expect(packs.map((p) => p.root)).toEqual(['grey-marches', 'core'])
    const read = zipToPacks(packsToZip(packs))
    expect(read.map((p) => p.root)).toEqual(['grey-marches', 'core'])
    expect(read[0].files).toEqual(packs[0].files)
    // A browser without them gets both, and plays the same system, maps included.
    expect(planImport([], read).added.map((p) => p.root)).toEqual(['grey-marches', 'core'])
    const elsewhere = travelSystems(loadPacks(engineFiles(read)).registry).systems
    const there = elsewhere.find((s) => s.id === 'grey-marches')!
    expect(there.packs).toEqual(marches.packs)
    expect(there.maps).toEqual(marches.maps)
    expect(there.rules).toEqual(marches.rules)
    expect(importedSystem(read)?.id).toBe('grey-marches')
    // Here, both are already there unchanged.
    expect(planImport(library.packs, read).same).toHaveLength(2)
    // An edited copy brought back replaces only what differs; ↶ undoes it in one step.
    const edited = read.map((p) =>
      p.root === 'grey-marches'
        ? {
            ...p,
            files: [
              ...p.files,
              {
                path: 'extra.yaml',
                content: 'kind: table\nid: x\nentries: [{ range: 1-6, result: X }]\n',
              },
            ],
          }
        : p,
    )
    const plan = planImport(library.packs, edited)
    expect(plan.replaced.map((p) => p.root)).toEqual(['grey-marches'])
    expect(plan.same.map((p) => p.root)).toEqual(['core'])
    library.addPacks(plan.replaced)
    expect(library.pack('grey-marches')?.overrides).toBe(true)
    expect(library.registry.definitions.has('grey-marches/x')).toBe(true)
    library.undo()
    expect(library.pack('grey-marches')?.origin).toBe('bundled')
  }, 30_000)
})
