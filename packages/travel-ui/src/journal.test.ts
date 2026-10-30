import { loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems, type JournalEntry } from '@open-tabletop/session'
import { corePack, coreSystem, greyMarchesPack } from '../../session/src/core.testing'
import { defaultCalendar } from '@open-tabletop/time'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import {
  actionNothingOf,
  entryText,
  filterJournal,
  journalMarkdown,
  whyText,
  type JournalContext,
} from './journal'
import { memberNamer } from './members'

const at = (day: number, clock: string) => defaultCalendar.at(day, clock)
const entry = (time: number, code: string, rest: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `j${time}`,
  time,
  at: '',
  source: 'travel',
  code,
  ...rest,
})

describe('journal export', () => {
  it('writes Markdown by day, oldest first, with the host’s names', () => {
    const journal = [
      entry(at(1, '06:00'), 'HEX_ENTERED', { data: { hex: '3' } }),
      entry(at(1, '07:30'), 'ORACLE_RESULT', {
        source: 'oracle',
        text: 'Rain\nall day',
        data: { event: 'WEATHER_CHECK_REQUIRED' },
      }),
      entry(at(2, '06:00'), 'DAY_STARTED', { data: { day: 2 } }),
      entry(at(2, '09:00'), 'NOTE', { source: 'user', text: 'We camp by the well' }),
    ]
    const markdown = journalMarkdown(
      journal,
      { t: translator(() => 'en'), startDay: 1, hexLabel: (h) => `Hex ${h}`, nameOf: (id) => id },
      'The Grey Marches',
    )
    expect(markdown).toBe(
      [
        '# The Grey Marches',
        '',
        '## Day 1',
        '',
        '- **06:00** Entered Hex 3',
        '- **07:30** Weather: Rain all day',
        '',
        '## Day 2',
        '',
        '- **09:00** _We camp by the well_',
        '',
      ].join('\n'),
    )
  })

  it('names checks as the system does', () => {
    const t = translator(() => 'en')
    const pending = entry(at(1, '06:00'), 'CHECK_PENDING', { data: { event: 'X_REQUIRED' } })
    const context = { t, startDay: 1, hexLabel: (h: string) => h, nameOf: (id: string) => id }
    expect(journalMarkdown([pending], context, 'T')).toContain('X REQUIRED: waiting for you')
    expect(journalMarkdown([pending], { ...context, checkName: () => 'Landmark' }, 'T')).toContain(
      'Landmark: waiting for you',
    )
    // A check that waits says the hex it came up in, by its name (as Entered … lines do).
    const there = entry(at(1, '06:00'), 'CHECK_PAUSED', {
      data: { event: 'X_REQUIRED', hex: '5,3' },
    })
    const named = { ...context, checkName: () => 'Landmark', hexLabel: () => 'The Grey Stones' }
    expect(journalMarkdown([there], named, 'T')).toContain(
      'Landmark at The Grey Stones: paused, go on when you are ready',
    )
    // A check nothing rolls and that doesn't pause: just its name.
    const noted = entry(at(1, '06:00'), 'CHECK_NOTED', { data: { event: 'X_REQUIRED' } })
    expect(journalMarkdown([noted], { ...context, checkName: () => 'Landmark' }, 'T')).toContain(
      'Landmark',
    )
  })
})

describe('journal lines', () => {
  const t = translator(() => 'en')
  const context = {
    t,
    startDay: 1,
    hexLabel: (h: string) => `Hex ${h}`,
    nameOf: (id: string) => id,
    actionName: () => 'Forage for food',
    valueName: (key: string) => ({ food: 'Food', morale: 'Morale' })[key] ?? key,
    // The party sheet's values, as the trip panel names them.
    memberName: (path: string) => (path === 'party.values.food' ? 'Food' : undefined),
    terrainName: (id: string) => ({ hills: 'Hills' })[id] ?? id,
  }
  const line = (code: string, data: Record<string, unknown>, more: Partial<JournalContext> = {}) =>
    entryText(entry(at(1, '06:00'), code, { data }), { ...context, ...more })

  it('say what came up as a condition turned true, for whom, and when they loop', () => {
    const memberName = (path: string) =>
      path.startsWith('characters.mara.') ? 'Mara: Health' : undefined
    expect(line('REACTED', { who: 'mara' }, { memberName })).toBe(
      'For Mara, a rule of the system comes into play:',
    )
    expect(line('REACTIONS_LOOP', {})).toMatch(/stopped after 10 in a row/)
    expect(line('MOMENT_REACHED', { at: 'when:{"when":{"a":1}}' })).toContain(
      'as its condition turned true',
    )
  })

  it('say why a march stopped: which pairs of its rule failed, with what they read', () => {
    const because = {
      condition: 'when',
      failed: [
        { path: 'trip.marched', value: 8.01111111111095, op: 'lt', asked: 8 },
        { path: 'hour', value: 21.5, op: 'lt', asked: 20 },
        { path: 'torchlit', value: undefined, op: 'eq', asked: true },
        { path: 'party.stats.morale', value: 0, op: 'gte', asked: 1 },
      ],
    }
    const dayValues = { torchlit: 'By torchlight' }
    expect(
      line('TRAVEL_STOPPED', { reason: 'conditions', action: 'march', because }, { dayValues }),
    ).toBe(
      '“Forage for food” stops here: the day’s march (hours) is 8.01: it needs under 8; the hour is 21:30: it needs under 20:00; By torchlight doesn’t hold; Morale is 0: it needs 1 or more.',
    )
    // An `unless` that held: what it read.
    const unless = {
      condition: 'unless',
      failed: [{ path: 'time.tags', value: ['dark'], op: 'eq', asked: 'dark', negated: true }],
    }
    expect(whyText(unless as never, context)).toBe('Not possible now: the time of day is dark.')
    // Older entries, without pairs: the rule alone.
    expect(line('TRAVEL_STOPPED', { reason: 'conditions', action: 'march' })).toBe(
      '“Forage for food” stops here: its conditions don’t hold now.',
    )
    // A value of the day: no travel, or only the way of travelling it leaves behind.
    const snow = { dayValues: { 'deep-snow': 'Deep snow' }, modeName: () => 'On horseback' }
    expect(line('TRAVEL_STOPPED', { reason: 'value', value: 'deep-snow' }, snow)).toBe(
      'Deep snow: no more travel today',
    )
    expect(
      line('TRAVEL_STOPPED', { reason: 'value', value: 'deep-snow', mode: 'horse' }, snow),
    ).toBe('Deep snow: “On horseback” can’t go on while it lasts; choose another way of travelling')
  })

  it('say what results changed', () => {
    const result = entry(at(1, '09:00'), 'ORACLE_RESULT', {
      text: 'Berries and roots',
      data: {
        event: 'FORAGE_CHECK_REQUIRED',
        value: {
          effects: { 'party.values.food': 1, 'party.stats.morale': -1 },
          lost: true,
          weather: 'rain',
        },
      },
    })
    const dayValues = { lost: 'lost for today' }
    expect(entryText(result, { ...context, dayValues, checkName: () => 'Foraging' })).toBe(
      'Foraging: Berries and roots (Food +1, Morale −1, lost for today)',
    )
  })

  it('say when an action rolled nothing, in the system’s words or the generic ones', () => {
    const taken = { action: 'forage', minutes: 180, checks: 0, hex: '4', terrain: 'hills' }
    expect(line('ACTION_TAKEN', taken)).toBe(
      'Forage for food (3 h): none of its rolls apply on Hills, so nothing happens',
    )
    expect(
      line('ACTION_TAKEN', taken, { actionNothing: () => 'nothing to forage on {terrain}' }),
    ).toBe('Forage for food (3 h): nothing to forage on Hills')
    // An action without checks has nothing to say; one whose check came up neither.
    expect(line('ACTION_TAKEN', taken, { actionNothing: () => '' })).toBe('Forage for food (3 h)')
    expect(line('ACTION_TAKEN', { ...taken, checks: 1 })).toBe('Forage for food (3 h)')
    // The system's own words, for an action a check is rolled at; nothing, for one without.
    const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
    const gm = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!.rules
    expect(actionNothingOf(gm, 'forage', 'en')).toMatch(/^nothing to forage on \{terrain\}/)
    expect(actionNothingOf(gm, 'eat', 'en')).toBe('')
    // What its steps changed is told either way.
    const eaten = { ...taken, minutes: 0, effects: { 'party.values.food': -1 } }
    expect(line('ACTION_TAKEN', eaten, { actionNothing: () => '' })).toBe(
      'Forage for food (Food −1)',
    )
    expect(line('ACTION_TAKEN', eaten, { actionNothing: () => 'nothing on {terrain}' })).toBe(
      'Forage for food (Food −1): nothing on Hills',
    )
  })

  it('tell supplies eaten, rests and fatigue with its reason', () => {
    expect(line('SUPPLIES_USED', { used: { food: 1 }, left: { food: 4 } })).toBe(
      'Supplies for the day: Food −1 (4 left)',
    )
    expect(line('LIMIT_REACHED', { path: 'party.values.food', limit: 'min', value: 0 })).toBe(
      'Food can’t go lower than 0',
    )
    expect(line('LIMIT_REACHED', { path: 'party.stats.morale', limit: 'max', value: 5 })).toBe(
      'Morale can’t go higher than 5',
    )
    expect(
      line('NIGHT_WITHOUT', {
        action: 'camp',
        because: expect.objectContaining({ condition: 'when' }),
        time: 0,
      }),
    ).toMatch(
      /^Night falls and “.+” isn’t possible \(Not possible here and now \(.+\)\): the night passes without it\.$/,
    )
    expect(line('RESTED', { minutes: 90 })).toBe('Rest for 1 h 30')
    expect(line('FATIGUE_CHANGED', { change: 1, fatigue: 2, reason: 'hunger' })).toBe(
      'Not enough to eat: fatigue +1 (now 2)',
    )
    expect(line('FATIGUE_CHANGED', { change: -1, fatigue: 0, reason: 'action', action: 'x' })).toBe(
      'Forage for food: fatigue −1 (now 0)',
    )
  })
})

describe('steps that speak and wait', () => {
  const t = translator(() => 'en')
  const context: JournalContext = {
    t,
    startDay: 1,
    hexLabel: (h) => h,
    nameOf: (id) => id,
    actionName: (id) => (id === 'ferry' ? 'Take the ferry' : id),
    textOf: (text) => (text as Record<string, string>).en,
    modeName: (id) => (id === 'boat' ? 'By boat' : id),
    paramName: () => 'How do you pay?',
    choiceName: (_a, _p, c) => (c === 'wait' ? 'Wait for her' : c),
  }
  const line = (code: string, data: Record<string, unknown>) =>
    entryText(entry(at(1, '06:00'), code, { data }), context)

  it('say the system’s own words, what waits for the player and what they chose', () => {
    expect(line('SAID', { action: 'ferry', text: { en: 'She casts off', es: 'Zarpa' } })).toBe(
      'She casts off',
    )
    expect(line('HELD', { waiting: { action: 'ferry', ask: 'fare' } })).toBe(
      'Take the ferry: How do you pay? (choose to go on)',
    )
    expect(line('HELD', { waiting: { action: 'ferry', text: { en: 'Afloat' } } })).toBe(
      'Take the ferry: Afloat',
    )
    expect(line('HELD', { waiting: { action: 'ferry' } })).toBe(
      'Take the ferry: the trip waits, go on when you are ready',
    )
    expect(line('RESUMED', { action: 'ferry', ask: 'fare', choice: 'wait' })).toBe(
      'How do you pay? → Wait for her',
    )
    expect(line('RESUMED', { action: 'ferry' })).toBe('Take the ferry: going on')
    expect(line('MODE_CHANGED', { action: 'ferry', from: 'foot', mode: 'boat' })).toBe(
      'Now travelling: By boat',
    )
    // Without the host's names: the first language written, the ids.
    expect(
      entryText(entry(0, 'SAID', { data: { text: { en: 'Hi' } } }), {
        ...context,
        textOf: undefined,
      }),
    ).toBe('Hi')
  })
})

describe('what results did to characters and the world', () => {
  const t = translator(() => 'en')
  const sheet = {
    kind: 'sheet' as const,
    id: 'companion',
    values: { health: { name: 'Health' } },
    conditions: { wounded: { name: 'Wounded' } },
    relations: {},
  }
  const factions = {
    id: 'm/default',
    pack: 'm',
    def: {
      kind: 'factions' as const,
      id: 'default',
      sheet: 'faction',
      factions: { vale: { name: 'The Vale' } },
    },
    sheet: { id: 'm/faction', def: { ...sheet, values: { reputation: { name: 'Reputation' } } } },
  }
  const system = {
    ...coreSystem(),
    sheet: { id: 'm/companion', def: sheet },
    factions,
  }
  const kael = {
    id: 'kael',
    name: 'Kael',
    sheet: 'm/companion',
    values: {},
    conditions: {},
    tags: [],
    cards: [],
    relations: [],
  }
  const line = (members: (typeof kael)[] | undefined, world?: Record<string, unknown>) =>
    entryText(
      entry(0, 'ACTION_TAKEN', {
        data: {
          action: 'rest',
          minutes: 0,
          checks: 1,
          effects: {
            'characters.kael.values.health': 1,
            'acting.conditions.wounded': 'false',
            'factions.vale.values.reputation': 1,
            'world.clocks.the-siege': 1,
          },
        },
      }),
      {
        t,
        startDay: 1,
        hexLabel: (h) => h,
        nameOf: (id) => id,
        // The system's name for the action (the trip panel passes its own).
        actionName: (id) => (id === 'rest' ? 'Rest' : id),
        memberName: memberNamer(system, members, 'en', t, world),
      },
    )

  it('names whom, and leaves out what didn’t happen here', () => {
    expect(line([kael], { factions: {}, clocks: {} })).toBe(
      'Rest (Kael: Health +1, Whoever acts: Wounded (no more), The Vale: Reputation +1, Clock “the siege” +1)',
    )
    // No characters, no factions or clocks on this host: none of it is told.
    expect(line(undefined)).toBe('Rest')
  })
})

describe('the journal’s detail, and its filter', () => {
  const t = translator(() => 'en')
  const context: JournalContext = {
    t,
    startDay: 1,
    hexLabel: (h) => `Hex ${h}`,
    nameOf: (id) => (id === 'gm/encounters' ? 'Wild encounters' : id),
    checkName: (event) => (event === 'AMBUSH' ? 'Ambush' : undefined),
    valueName: (key) => (key === 'food' ? 'Food' : key),
    memberName: (path) => (path === 'party.values.food' ? 'Food' : undefined),
    actionName: (id) => (id === 'forage' ? 'Forage' : id),
    partName: (ref) => (ref === 'time.day.dusk' ? 'Day: dusk' : undefined),
  }
  const journal = [
    entry(at(1, '06:00'), 'MOMENT_REACHED', { data: { at: 'time.day.dusk' } }),
    entry(at(1, '06:00'), 'CHECK_SKIPPED', {
      data: {
        check: 'AMBUSH',
        at: 'trip.place-enter',
        condition: 'when',
        failed: [{ path: 'place.danger', value: 1, op: 'gte', asked: 2 }],
      },
    }),
    entry(at(1, '07:00'), 'ROLLED', {
      source: 'oracle',
      data: {
        check: 'ENCOUNTER_CHECK_REQUIRED',
        rolls: [
          { source: 'gm/encounters', entry: '7', dice: ['2d6 → 7  [3, 4]'], depth: 0 },
          { source: 'gm/wolves', dice: ['1d6 → 3  [3]'], depth: 1 },
        ],
      },
    }),
    entry(at(1, '07:00'), 'ORACLE_RESULT', {
      source: 'oracle',
      text: 'Wolves',
      data: { event: 'ENCOUNTER_CHECK_REQUIRED' },
    }),
    entry(at(1, '07:00'), 'CHANGED', { data: { path: 'party.values.food', from: 5, to: 3 } }),
    entry(at(1, '08:00'), 'WEATHER_ROLLED', {
      source: 'oracle',
      data: { check: 'WEATHER_CHECK_REQUIRED', weather: 'light-rain', total: 7, move: 'se' },
    }),
    entry(at(1, '09:00'), 'HEX_ENTERED', { data: { hex: '3' } }),
    entry(at(1, '09:00'), 'NOTE', { source: 'user', text: 'Wolves again' }),
  ]

  it('tells what happened behind in words', () => {
    expect(journal.slice(0, 3).map((e) => entryText(e, context))).toEqual([
      'Moment: Day: dusk',
      'Ambush doesn’t come up: the place’s danger is 1: it needs 2 or more',
      'Encounter rolled: Wild encounters: 2d6 → 7  [3, 4] → 7; gm/wolves: 1d6 → 3  [3]',
    ])
    expect(entryText(journal[4], context)).toBe('Food: 5 → 3')
    expect(entryText(journal[5], context)).toBe('Weather: 2d6 = 7, south-east → light rain')
    expect(entryText(entry(0, 'MOMENT_REACHED', { data: { at: 'actions.forage' } }), context)).toBe(
      'Moment: after “Forage”',
    )
  })

  it('shows up to a level, of some topics, with some words; exports what it shows', () => {
    const codes = (filter: Parameters<typeof filterJournal>[1]) =>
      filterJournal(journal, filter, context).map((e) => e.code)
    // As the journal always was: the story and the rules.
    expect(codes({ level: 'mechanics' })).toEqual(['ORACLE_RESULT', 'HEX_ENTERED', 'NOTE'])
    expect(codes({ level: 'story' })).toEqual(['ORACLE_RESULT', 'NOTE'])
    expect(codes({ level: 'detail' })).toHaveLength(journal.length)
    expect(codes({ level: 'detail', topics: ['oracle'] })).toEqual([
      'ROLLED',
      'ORACLE_RESULT',
      'WEATHER_ROLLED',
    ])
    expect(codes({ level: 'detail', search: 'WOLVES' })).toEqual([
      'ROLLED',
      'ORACLE_RESULT',
      'NOTE',
    ])
    const markdown = journalMarkdown(
      filterJournal(journal, { level: 'detail', search: 'ambush' }, context),
      context,
      'T',
    )
    expect(markdown).toContain('- **06:00** Ambush doesn’t come up')
    expect(markdown).not.toContain('Wolves')
  })
})
