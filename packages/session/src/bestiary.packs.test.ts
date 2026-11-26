import type { DiceResult } from '@open-tabletop/dice'
import type { SessionState } from './index'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { encounterView, fightStarters } from './encounter'
import { applyResult, rolledNodes, type JournalEntry } from './index'
import { newMember } from './party'
import { faceIcon, fightersHere, templateLook } from './present'
import { templateCopy } from './index'
import { lookupTemplates, valuesNow } from '@open-tabletop/character-engine'
import {
  partyOf,
  settleTrip,
  startTrip as startPaced,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
} from './trip'

/**
 * Trips whose foes play their turns one after another at once (**Foes' turns at once**): what
 * these tests read is each fight's whole round; waiting for Next is tested apart.
 */
const startTrip = (o: Parameters<typeof startPaced>[0]) => {
  const started = startPaced(o)
  const session: SessionState = { ...started.session, foesAtOnce: true }
  return { ...started, session }
}

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const { systems, problems } = travelSystems(registry)
const marches = systems.find((s) => s.id === 'grey-marches')!
const core = systems.find((s) => s.id === 'core')!
const heath: TravelWorld = {
  km: () => 10,
  place: () => ({ terrain: 'heath', fields: { danger: '4' } }),
  neighbors: () => [],
  distance: () => 0,
  connections: () => [],
}

/** Two companions: Kael, stealthy, and Mara. */
const people = (system: typeof marches) => {
  const rules = partyOf(system)
  return [
    newMember(rules, { id: 'kael', name: 'Kael', values: { stealth: 3 } }),
    newMember(rules, { id: 'mara', name: 'Mara', values: { stealth: 0 } }),
  ]
}

/** A result of a table rolled as a trip's check would, with a seed that brings `entry`. */
function rollUntil(table: string, entry: string, context: Record<string, unknown>) {
  for (let seed = 1; seed < 200; seed++) {
    const out = createOracleEngine({ registry, random: seeded(seed) }).resolve(table, context)
    if (out.resolution.entry === entry) return out.resolution
  }
  throw new Error(`no ${entry} in 200 seeds`)
}

describe('the bundled packs make foes from their bestiaries', () => {
  it('load without problems', () => {
    expect(problems.filter((p) => p.at?.startsWith('@bestiary'))).toEqual([])
    expect(marches.bestiary?.map((b) => b.id)).toEqual(['grey-marches/marches'])
    expect(core.bestiary?.map((b) => b.id)).toEqual(['core/foes'])
  })

  it('each copy is drawn with its template’s token: a wolf’s head; none says none', () => {
    const marchesTemplates = lookupTemplates(marches.bestiary!)
    const rules = partyOf(marches)
    const wolf = templateCopy(rules, 'grey-wolf', { id: 'w', name: 'Grey wolf' }, 'w')!
    expect(templateLook(marchesTemplates, wolf)).toEqual({ icon: 'game:wolf-head', kind: 'enemy' })
    expect(
      templateLook(marchesTemplates, { template: { id: 'nobody', from: 'x' } }),
    ).toBeUndefined()
    expect(templateLook(marchesTemplates, {})).toBeUndefined()
    expect(templateLook(undefined, wolf)).toBeUndefined()
    // A face: one's own token first, else the template's; none, and it's their initial.
    expect(faceIcon(marchesTemplates, wolf)).toBe('game:wolf-head')
    expect(faceIcon(marchesTemplates, { ...wolf, token: { icon: 'game:ghost' } })).toBe(
      'game:ghost',
    )
    expect(faceIcon(marchesTemplates, { token: { icon: 'game:archer' } })).toBe('game:archer')
    expect(faceIcon(marchesTemplates, {})).toBeUndefined()
  })

  it('the Grey Marches: wolves come with their leader, are driven off, and the pack breaks', () => {
    const rules = partyOf(marches)
    const members = [
      newMember(rules, { id: 'kael', name: 'Kael', values: { survival: 2 } }),
      newMember(rules, { id: 'mara', name: 'Mara' }),
    ]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const facts = tripFacts({ system: marches, world: heath }, session)
    const wolves = rollUntil('grey-marches/table.encounter', 'wolves', {
      ...facts,
      'place.terrain': 'heath',
      'place.danger': 4,
      'time.season': 'autumn',
    })
    const count = Number(wolves.text!.split(' ')[0])
    expect(wolves.text).toMatch(/^\d grey wolves, their leader among them — they are /)
    let s = applyResult(session, wolves.value, marches.bindings?.stats, rules)
    const here = () =>
      tripFacts({ system: marches, world: heath }, s).present as Record<string, unknown>
    expect(here()).toMatchObject({
      count,
      'grey-wolf': { count: count - 1 },
      'pack-leader': { count: 1 },
      tags: ['foe', 'beast', 'pack', 'fears-fire', 'leader'],
    })
    expect(s.present!.at(-1)!.character).toMatchObject({
      name: 'Pack leader',
      sheet: 'grey-marches/foe',
      values: { harm: 2, morale: 9 },
    })
    // Nothing to buy off (no outlaws); something to drive off.
    s = { ...s, acting: 'kael' }
    const open = tripAvailability({ system: marches, world: heath }, s)
    expect(open['drive-off']).toBeUndefined()
    expect(open['buy-off']).toMatchObject({ condition: 'when' })
    // The leader struck down by hand: the pack breaks and runs at the next step.
    s = applyResult(s, { effects: { 'characters.pack-leader.values.health': '=0' } }, {}, rules)
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const done = stepTrip({ system: marches, world: heath, oracle }, s, {
      type: 'action',
      id: 'drive-off',
    })
    expect(done.state.present).toEqual([])
    // The leader fell: stripped as it left (a beast leaves nothing); the wolves that ran, not.
    const stripped = done.entries.filter(
      (e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'strip-the-fallen',
    )
    expect(stripped).toHaveLength(1)
    expect(
      done.entries.find(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'grey-marches/fallen',
      )?.text,
    ).toBe('Nothing worth taking')
    const codes = done.entries.map((e) => e.code)
    expect(codes).toContain('PRESENT_LEFT')
    expect(
      done.entries.some((e) => e.data?.id === 'pack-leader' && e.data?.because === 'condition'),
    ).toBe(true)
    // Kael's Survival 2: no harm to him.
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(3)
  })

  it('the Grey Marches: a lone wolf put here has no leader to lose, and stays', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const s = applyResult(session, { effects: { 'present.grey-wolf': 1 } }, {}, rules)
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const done = stepTrip({ system: marches, world: heath, oracle }, s, {
      type: 'wait',
      until: s.travel.time + 30,
    })
    expect(done.state.present).toHaveLength(1)
    expect(done.entries.some((e) => e.data?.action === 'pack-breaks')).toBe(false)
  })
  it("I roll everything: an action's own dice wait for the player, then it's played with them", () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: [
        newMember(partyOf(marches), { id: 'kael', name: 'Kael', values: { survival: 2 } }),
        newMember(partyOf(marches), { id: 'mara', name: 'Mara' }),
      ],
      seed: 'd',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    // Mara is wounded, at 1 health of her 5; Kael, with Survival 2, tends her.
    const s = applyResult(
      { ...session, rollWay: 'all', acting: 'kael' },
      {
        effects: {
          'characters.mara.conditions.wounded': true,
          'characters.mara.values.health': '=1',
        },
      },
      {},
      partyOf(marches),
    )
    const health = (state: SessionState) =>
      state.members?.find((m) => m.id === 'mara')?.values.health
    // Tend the wounded: its 1d2 of health is the player's, nothing done until it's given.
    const asked = stepTrip(options, s, { type: 'action', id: 'tend' })
    expect(asked.state.yours).toEqual([
      expect.objectContaining({ dice: '1d2', table: 'actions.tend', who: 'kael' }),
    ])
    expect(asked.state.travel.time).toBe(s.travel.time)
    expect(health(asked.state)).toBe(1)
    expect(asked.entries.map((e) => e.code)).toEqual(['ACTION_YOURS'])
    // While it waits, nothing else goes on.
    expect(stepTrip(options, asked.state, { type: 'wait', until: 12 * 60 }).state).toBe(asked.state)
    // The player's 2: the hour passes, the wound is bound and Mara gets 2 back.
    const id = asked.state.yours![0]!.id
    const done = stepTrip(options, asked.state, { type: 'rolled', id, total: 2 })
    expect(done.state.yours).toBeUndefined()
    expect(health(done.state)).toBe(3)
    expect(done.state.members?.find((m) => m.id === 'mara')?.conditions.wounded).toBeFalsy()
    expect(done.state.travel.time).toBe(s.travel.time + 60)
    // Rolled for them instead: the computer's 1d2.
    const forMe = stepTrip(options, asked.state, { type: 'resolveCheck', id })
    expect(forMe.state.yours).toBeUndefined()
    expect(health(forMe.state)).toBeGreaterThan(1)
  })

  it('the Grey Marches: drive them off is a roll against the firmest foe’s Morale, or the fight', () => {
    const drive = (seed: number, members: boolean, trip = 'd') => {
      const { session } = startTrip({
        system: marches,
        location: 'a',
        ...(members && {
          members: [
            newMember(partyOf(marches), { id: 'kael', name: 'Kael', values: { survival: 2 } }),
          ],
        }),
        seed: trip,
        time: 9 * 60,
      })
      const options = {
        system: marches,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(seed) }),
      }
      const s = applyResult(
        { ...session, ...(members && { acting: 'kael' }) },
        { effects: { 'present.grey-wolf': 2 } },
        {},
        partyOf(marches),
      )
      return { before: s, after: stepTrip(options, s, { type: 'action', id: 'drive-off' }) }
    }
    const seen = new Set<string>()
    for (let seed = 1; seed <= 40 && seen.size < 4; seed++)
      for (const members of [true, false]) {
        const { before, after } = drive(seed, members)
        const text = after.entries.find((e) => e.code === 'ORACLE_RESULT')?.text ?? ''
        const entry = text.startsWith('They break and run')
          ? members
            ? 'routed'
            : 'routed-alone'
          : text.startsWith('They hold their ground')
            ? 'stand'
            : text.startsWith('They will not be driven off')
              ? 'hold'
              : `seed ${seed}: ${text}`
        seen.add(entry)
        if (entry === 'routed' || entry === 'routed-alone')
          expect(after.state.present ?? []).toEqual([])
        // The fight begins (its first turns may already have gone: foes' turns at once).
        if (entry === 'stand')
          expect(after.entries.some((e) => e.code === 'ENCOUNTER_STARTED')).toBe(true)
        if (entry === 'hold') {
          expect(after.state.encounter).toBeUndefined()
          expect(after.state.present).toHaveLength(2)
          expect(after.state.stats.morale).toBe(before.stats.morale - 1)
        }
        expect(members ? ['routed', 'stand'] : ['routed-alone', 'hold']).toContain(entry)
      }
    expect([...seen].sort()).toEqual(['hold', 'routed', 'routed-alone', 'stand'])
    // In a fight (one still going once the foes' first turns are played), it's gone: Strike
    // one down or Fall back.
    const after = 'abcdefghij'
      .split('')
      .map((trip) => drive(1, true, trip).after)
      .find((a) => a.state.encounter !== undefined)!
    expect(after.state.encounter).toBeDefined()
    expect(
      tripAvailability({ system: marches, world: heath }, after.state)['drive-off'],
    ).toBeDefined()
  })

  it('the Grey Marches: bandits and their chief are bought off with rations', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const hills = { ...heath, place: () => ({ terrain: 'hills', fields: { danger: '4' } }) }
    const facts = tripFacts({ system: marches, world: hills }, session)
    const bandits = rollUntil('grey-marches/table.encounter', 'bandits', facts)
    let s = applyResult(session, bandits.value, marches.bindings?.stats, rules)
    const count = Number(bandits.text!.split(' ')[0])
    expect(s.present).toHaveLength(count)
    expect(s.present!.at(-1)!.character.name).toBe('Bandit chief')
    // No names of their own: _Bandit 1_, _Bandit 2_… (one alone, _Bandit_).
    const band = s.present!.slice(0, -1).map((p) => p.character.name)
    expect(band).toEqual(
      count > 2 ? Array.from({ length: count - 1 }, (_, i) => `Bandit ${i + 1}`) : ['Bandit'],
    )
    // Enough rations for all of them (two each companion starts with, and more).
    s = applyResult(s, { effects: { 'party.items.ration': count } }, {}, rules)
    expect(tripAvailability({ system: marches, world: heath }, s)['buy-off']).toBeUndefined()
    const paid = stepTrip({ system: marches, world: heath }, s, { type: 'action', id: 'buy-off' })
    expect(paid.state.present).toEqual([])
    expect(
      paid.entries.filter((e) => e.code === 'PRESENT_LEFT').map((e) => e.data?.condition),
    ).toEqual(Array(count).fill('bought-off'))
  })

  it('the Grey Marches: a traveller who wants an escort pays at Fort Keld, and walks off if refused', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const road: TravelWorld = {
      km: () => 1,
      place: (id) => ({ terrain: 'plains', danger: 2, tags: id === 'fort' ? ['garrison'] : [] }),
      neighbors: (id) => (id === 'a' ? ['b', 'fort'] : ['a']),
      distance: () => 1,
      connections: () => ['road'],
    }
    const options = { system: marches, world: road }
    const start = () =>
      startTrip({ system: marches, location: 'a', members, seed: 'x', season: 'summer' }).session
    const meeting = () => {
      for (let seed = 1; seed < 500; seed++) {
        const made = createOracleEngine({ registry, random: seeded(seed) }).resolve(
          'grey-marches/table.encounter',
          tripFacts(options, start()),
        ).resolution
        const offer = (made.value.effects as Record<string, unknown> | undefined)?.[
          'party.values.escort-offer'
        ]
        if (made.entry === 'traveller' && offer) return made
      }
      throw new Error('no escort in 500 seeds')
    }
    const met = meeting()
    expect(met.text).toMatch(/^On the way you meet a \S+ who wants an escort to Fort Keld$/)
    let s = applyResult(start(), met.value, marches.bindings?.stats, rules)
    expect(s.present?.[0].character.template?.id).toBe('traveller')
    const values = () => (tripFacts(options, s).party as { values: Record<string, number> }).values
    const offered = values()['escort-offer']
    expect(offered).toBeGreaterThanOrEqual(6)
    const can = () => tripAvailability(options, s).escort
    expect(can()).toBeFalsy()

    // Taken up: the offer is a promise, and the traveller walks with the Company.
    s = stepTrip(options, s, { type: 'action', id: 'escort' }).state
    expect(values()).toMatchObject({ escort: offered, 'escort-offer': 0 })
    expect(s.present).toEqual([])
    const silver = s.stats.silver as number

    // Entering the fort pays it, once.
    const walkTo = (place: string) => {
      s = stepTrip(options, s, { type: 'setDestination', place }).state
      for (let i = 0; i < 8 && s.travel.location !== place; i++) {
        for (const c of s.travel.pendingChecks)
          s = stepTrip(options, s, { type: 'resolveCheck', id: c.id }).state
        s = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } }).state
      }
      expect(s.travel.location).toBe(place)
    }
    walkTo('fort')
    expect(s.stats.silver).toBe(silver + offered)
    expect(values().escort).toBe(0)

    // Refused: walking on, the traveller is gone and the offer with them.
    s = applyResult(start(), met.value, marches.bindings?.stats, rules)
    walkTo('b')
    expect(s.present).toEqual([])
    expect(values()['escort-offer']).toBe(0)
  })

  it('Core: trouble on the road makes its foes, gone once down', () => {
    const rules = partyOf(core)
    const { session } = startTrip({ system: core, location: 'a', seed: 'x' })
    const trouble = rollUntil('core/table.trouble', 'foes', {})
    const count = Number(trouble.text!.split(' ')[0])
    let s = applyResult(session, trouble.value, {}, rules)
    expect(s.present).toHaveLength(count)
    // As many as the table's own roll (`1d3!1`), numbered when more than one.
    expect(s.present![0].character).toMatchObject({
      name: count > 1 ? 'Foe 1' : 'Foe',
      sheet: 'core/character',
    })
    s = applyResult(s, { effects: { 'present.foe.values.health': '=0' } }, {}, rules)
    const oracle = createOracleEngine({ registry, random: seeded(2) })
    const food = s.party!.values.food
    const done = stepTrip({ system: core, world: heath, oracle }, s, { type: 'moment', at: '' })
    expect(done.state.present).toEqual([])
    // Each one that fell is searched as it leaves: a day's food on a 5 or a 6.
    const found = done.entries.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'core/fallen',
    )
    expect(found).toHaveLength(count)
    const days = found.filter((e) => e.text === "A day's food").length
    expect(done.state.party!.values.food).toBe(food + days)
  })

  it('the fallen leave gear worn down: the newest one given, not the one already held', () => {
    // Core's dented shield, to a character already holding one whole.
    const coreRules = partyOf(core)
    const hero = newMember(coreRules, { id: 'ana', name: 'Ana' })
    let c = startTrip({ system: core, location: 'a', members: [hero], seed: 'x' }).session
    c = applyResult(c, { effects: { 'party.items.shield': 1 } }, {}, coreRules)
    const dented = rollUntil('core/table.fallen', 'shield', {})
    c = applyResult(c, dented.value, {}, coreRules)
    expect(c.members![0].items!.map((i) => [i.id, i.count, i.fields.wear])).toEqual([
      ['shield', 1, 6],
      ['shield', 1, 4],
    ])
    // The Grey Marches' restless dead: a mail shirt rusted a step, the one worn untouched.
    const rules = partyOf(marches)
    const kael = newMember(rules, { id: 'kael', name: 'Kael' })
    let s = startTrip({ system: marches, location: 'a', members: [kael], seed: 'x' }).session
    s = applyResult(s, { effects: { 'party.items.mail': 1 } }, {}, rules)
    const rusted = rollUntil('grey-marches/table.fallen', 'barrow-mail', {
      acting: { tags: ['undead'] },
    })
    s = applyResult(s, rusted.value, {}, rules)
    const mails = s.members![0].items!.filter((i) => i.id === 'mail')
    // No room for it on the body (a mail fills it), the only place it fits: in no place.
    expect(mails.map((i) => [i.place, i.fields.wear])).toEqual([
      ['body', 8],
      [undefined, 6],
    ])
  })

  it('the Grey Marches: the fallen are stripped as they leave, by who they were', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const hills = { ...heath, place: () => ({ terrain: 'hills', fields: { danger: '4' } }) }
    const bandits = rollUntil(
      'grey-marches/table.encounter',
      'bandits',
      tripFacts({ system: marches, world: hills }, session),
    )
    let s = applyResult(session, bandits.value, marches.bindings?.stats, rules)
    const count = Number(bandits.text!.split(' ')[0])
    // What they carry: each its rations (1d2 a bandit, 2 the chief).
    const carried = s.present!.reduce(
      (n, p) =>
        n + (p.character.items ?? []).reduce((m, i) => m + (i.id === 'ration' ? i.count : 0), 0),
      0,
    )
    const rations = () =>
      (
        tripFacts({ system: marches, world: hills }, s).party as {
          items: Record<string, { count: number }>
        }
      ).items.ration.count
    const before = { silver: s.party!.values.silver, rations: rations() }
    // All of them struck down at once.
    s = applyResult(s, { effects: { 'present.all.values.health': '=0' } }, {}, rules)
    const oracle = createOracleEngine({ registry, random: seeded(4) })
    const done = stepTrip({ system: marches, world: hills, oracle }, s, { type: 'moment', at: '' })
    s = done.state
    expect(s.present).toEqual([])
    const texts = done.entries
      .filter((e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'grey-marches/fallen')
      .map((e) => e.text!)
    // The bandits' purses, the chief's hoard (the treasure rolled on), every ration taken.
    expect(texts.filter((t) => t.startsWith('A purse of '))).toHaveLength(count - 1)
    expect(texts.filter((t) => t.startsWith('The chief’s hoard'))).toHaveLength(1)
    expect(rations()).toBe(before.rations + carried)
    expect(s.party!.values.silver).toBeGreaterThan(before.silver)
  })
})

describe('beset by foes', () => {
  // Two places a step apart, nothing on the way.
  const road: TravelWorld = {
    km: () => 1,
    place: () => ({ terrain: 'plains' }),
    neighbors: (id) => (id === 'a' ? ['b'] : ['a']),
    distance: () => 1,
    connections: () => ['road'],
  }

  it('the Grey Marches: an outrider of the Vale rides with the Company in its lands, fights at its side, turns back beyond them', () => {
    // a and b in the Vale, c beyond it; the Vale thinks well of the Company.
    const vale: TravelWorld = {
      km: () => 1,
      place: (id) => ({ terrain: 'plains', region: id === 'c' ? 'The Heath' : 'Ashford Vale' }),
      neighbors: (id) => (id === 'a' ? ['b'] : id === 'b' ? ['a', 'c'] : ['b']),
      distance: () => 1,
      connections: () => ['road'],
    }
    const facts = { factions: { 'the-vale': { values: { reputation: 2 } } } }
    const options = {
      system: marches,
      world: vale,
      facts,
      oracle: createOracleEngine({ registry, random: seeded(5) }),
    }
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'o',
      time: 9 * 60,
    })
    let s = applyResult(session, { effects: { 'present.vale-rider': 2 } }, {}, partyOf(marches))
    expect(tripAvailability(options, s)['ask-outrider']).toBeUndefined()
    // Not while the Vale thinks ill of them.
    const cold = { ...options, facts: { factions: { 'the-vale': { values: { reputation: 0 } } } } }
    expect(tripAvailability(cold, s)['ask-outrider']).toMatchObject({ condition: 'when' })
    s = stepTrip(options, s, { type: 'action', id: 'ask-outrider' }).state
    const allies = (st: SessionState) =>
      (st.present ?? []).filter((p) => p.side === 'party').map((p) => [p.character.id, p.at])
    expect(allies(s)).toEqual([['vale-outrider', 'a']])
    expect(s.present!.filter((p) => p.character.template?.id === 'vale-rider')).toHaveLength(1)
    expect(tripAvailability(options, s)['ask-outrider']).toMatchObject({ condition: 'when' })
    // A fight: two bandits, one each for Kael and Mara, the outrider set against nobody but
    // still going for one of them (the next standing); foes aim at the companions or at it.
    let fought = stepTrip(
      options,
      // The patrol rode on (with one here, Stand and fight waits); the outrider, though it's
      // of the Vale too, isn't one of those met (`present.tags` leaves it out).
      applyResult(
        s,
        { effects: { 'present.bandit': 3, 'present.vale-rider': '=0' } },
        {},
        partyOf(marches),
      ),
      { type: 'action', id: 'stand' },
    )
    const all: JournalEntry[] = [...fought.entries]
    const first = fought.state.encounter?.order
    for (let turn = 0; turn < 80 && fought.state.encounter; turn++) {
      const foe = fightersHere(fought.state)[0]?.character.id
      fought = stepTrip(options, fought.state, { type: 'action', id: 'strike', with: { foe } })
      if (fought.state.travel.waiting)
        fought = stepTrip(options, fought.state, { type: 'resume', choice: foe })
      all.push(...fought.entries)
    }
    const turns = all.filter((e) => e.code === 'ENCOUNTER_TURN')
    const its = turns.filter((e) => e.data?.id === 'vale-outrider')
    expect(its.length).toBeGreaterThan(0)
    for (const t of its) expect(String(t.data?.target)).toMatch(/^bandit/)
    expect(
      all.some((e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'grey-marches/outrider-turn'),
    ).toBe(true)
    // One each, in the fight's order: the first bandit to act goes for Kael, the second for
    // Mara, the third for the outrider (the next one standing, if that one fell).
    const bandits = (first ?? []).filter((id) => id.startsWith('bandit'))
    const aimedAt = (id: string) => turns.find((e) => e.data?.id === id)?.data?.target
    const side = ['kael', 'mara', 'vale-outrider']
    bandits.forEach((id, k) => {
      if (aimedAt(id) !== undefined) expect(side.slice(k)).toContain(aimedAt(id))
    })
    expect(aimedAt(bandits[0])).toBe('kael')
    // In the Vale's lands it rides along; beyond them it turns back, gone.
    s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
    s = stepTrip(options, s, { type: 'action', id: 'march' }).state
    expect(s.travel.location).toBe('b')
    expect(allies(s)).toEqual([['vale-outrider', 'b']])
    s = stepTrip(options, s, { type: 'setDestination', place: 'c' }).state
    s = stepTrip(options, s, { type: 'action', id: 'march' }).state
    expect(s.travel.location).toBe('c')
    expect(allies(s)).toEqual([])
  })

  it('Core: no moving on, exploring or resting beside a foe, until the party gets away', () => {
    const options = { system: core, world: road }
    const { session } = startTrip({ system: core, location: 'a', seed: 'b', time: 9 * 60 })
    let s = settleTrip(
      options,
      applyResult(session, { effects: { 'present.foe': 1 } }, {}, partyOf(core)),
    ).state
    const open = tripAvailability(options, s)
    expect(open.travel).toEqual({ value: 'beset', who: 'party' })
    expect(open.explore).toEqual({ value: 'beset', who: 'party' })
    expect(open.rest).toEqual({ value: 'beset', who: 'party' })
    // No characters: no fight, the button says why.
    expect(open.fight).toMatchObject({ condition: 'needs' })
    expect(open['get-away']).toBeUndefined()
    expect(open.run).toBeUndefined()
    const beset = s
    // Running costs nothing, but the foe follows to the next place: beset there again.
    s = stepTrip(options, beset, { type: 'action', id: 'run' }).state
    expect(tripAvailability(options, s).travel).toBeUndefined()
    s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
    let walked = stepTrip(options, s, { type: 'action', id: 'march' })
    expect(walked.state.travel.location).toBe('b')
    expect(walked.state.present!.map((p) => p.at)).toEqual(['b'])
    expect(walked.entries.some((e) => e.code === 'PRESENT_FOLLOWED')).toBe(true)
    expect(tripAvailability(options, walked.state).travel).toEqual({ value: 'beset', who: 'party' })
    // Getting away costs a day's food, and the foe stays behind.
    const food = beset.party!.values.food
    s = stepTrip(options, beset, { type: 'action', id: 'get-away' }).state
    expect(s.party!.conditions).toHaveProperty('got-away')
    expect(s.party!.values.food).toBe(food - 1)
    expect(tripAvailability(options, s).travel).toBeUndefined()
    // On to the next place: getting away is over there; the foe stays behind.
    s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
    walked = stepTrip(options, s, { type: 'action', id: 'march' })
    s = walked.state
    expect(s.travel.location).toBe('b')
    expect(s.present!.map((p) => p.at)).toEqual(['a'])
    expect(walked.entries.some((e) => e.code === 'PRESENT_FOLLOWED')).toBe(false)
    expect(s.party!.conditions).not.toHaveProperty('got-away')
    expect(tripAvailability(options, s).travel).toBeUndefined()
  })

  it('the Grey Marches: a foe besets the Company, a traveller doesn’t; falling back lets it march away', () => {
    const options = { system: marches, world: road }
    const { session } = startTrip({ system: marches, location: 'a', seed: 'b', time: 9 * 60 })
    const rules = partyOf(marches)
    const traveller = applyResult(session, { effects: { 'present.traveller': 1 } }, {}, rules)
    expect(tripAvailability(options, settleTrip(options, traveller).state).travel).toBeUndefined()
    let s = settleTrip(
      options,
      applyResult(session, { effects: { 'present.bandit': 1 } }, {}, rules),
    ).state
    const open = tripAvailability(options, s)
    for (const id of ['travel', 'camp', 'forage', 'look-for-tracks'])
      expect(open[id]).toEqual({ value: 'beset', who: 'party' })
    // Without companions: no fight, but driving them off is open.
    expect(open.stand).toMatchObject({ condition: 'needs' })
    expect(open['drive-off']).toBeUndefined()
    // Given ground (as Fall back leaves it): it may march away, and it's over at the next place.
    s = {
      ...s,
      party: { ...s.party!, conditions: { ...s.party!.conditions, 'gave-ground': { left: 1 } } },
    }
    s = settleTrip(options, s).state
    expect(tripAvailability(options, s).travel).toBeUndefined()
    s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
    for (let i = 0; i < 4 && s.travel.location !== 'b'; i++) {
      for (const c of s.travel.pendingChecks)
        s = stepTrip(options, s, { type: 'resolveCheck', id: c.id }).state
      s = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } }).state
    }
    expect(s.travel.location).toBe('b')
    expect(s.party!.conditions).not.toHaveProperty('gave-ground')
    // The bandit followed (on foot, still hostile): beset again.
    expect(s.present!.map((p) => [p.character.id, p.at])).toEqual([['bandit', 'b']])
    expect(tripAvailability(options, s).travel).toEqual({ value: 'beset', who: 'party' })
  })

  it('the Grey Marches: a bandit can’t follow the Company on horseback; wolves stop for meat', () => {
    const options = { system: marches, world: road }
    const rules = partyOf(marches)
    const { session } = startTrip({ system: marches, location: 'a', seed: 'b', time: 9 * 60 })
    const away = (from: SessionState) => {
      let s: SessionState = {
        ...from,
        party: {
          ...from.party!,
          conditions: { ...from.party!.conditions, 'gave-ground': { left: 1 } },
        },
      }
      s = settleTrip(options, s).state
      s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
      for (let i = 0; i < 4 && s.travel.location !== 'b'; i++) {
        for (const c of s.travel.pendingChecks)
          s = stepTrip(options, s, { type: 'resolveCheck', id: c.id }).state
        s = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } }).state
      }
      expect(s.travel.location).toBe('b')
      return s
    }
    // Riding away: the bandit is left behind, and gone (the bestiary's `behind: leave`).
    const bandit = settleTrip(
      options,
      applyResult(session, { effects: { 'present.bandit': 1 } }, {}, rules),
    ).state
    const ridden = away({ ...bandit, travel: { ...bandit.travel, mode: 'horse' } })
    expect(ridden.present ?? []).toEqual([])
    // Wolves follow, until meat is thrown to them: two rations, and they gorge.
    let wolves = settleTrip(
      options,
      applyResult(
        session,
        { effects: { 'present.grey-wolf': 2, 'party.items.ration': 4 } },
        {},
        rules,
      ),
    ).state
    expect(away(wolves).present!.map((p) => p.at)).toEqual(['b', 'b'])
    const rations = (st: SessionState) =>
      (tripFacts(options, st).party as { items: { ration: { count: number } } }).items.ration.count
    const before = rations(wolves)
    expect(tripAvailability(options, wolves)['throw-meat']).toBeUndefined()
    wolves = stepTrip(options, wolves, { type: 'action', id: 'throw-meat' }).state
    expect(wolves.present!.every((p) => 'fed' in p.character.conditions)).toBe(true)
    expect(rations(wolves)).toBe(before - 2)
    // No longer hostile: the Company isn't beset, and marches off without them.
    expect(tripAvailability(options, wolves).travel).toBeUndefined()
    expect(tripAvailability(options, wolves)['throw-meat']).toBeDefined()
    expect(away(wolves).present ?? []).toEqual([])
  })

  it('the Grey Marches: bandits met kindly don’t beset the Company, until it stands and fights', () => {
    const options = { system: marches, world: road }
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'b' })
    const hills = { ...road, place: () => ({ terrain: 'hills', fields: { danger: '4' } }) }
    const facts = tripFacts({ system: marches, world: hills }, session)
    /** The bandits, their reaction `how` (its text). */
    const met = (how: RegExp) => {
      for (let seed = 1; seed < 400; seed++) {
        const out = createOracleEngine({ registry, random: seeded(seed) }).resolve(
          'grey-marches/table.encounter',
          facts,
        ).resolution
        if (out.entry === 'bandits' && how.test(out.text!))
          return settleTrip(options, applyResult(session, out.value, {}, rules)).state
      }
      throw new Error(`no bandits ${how}`)
    }
    // Hostile: every one of them is, and the Company is beset.
    const hostile = met(/they are hostile$/)
    expect(hostile.present!.every((p) => 'hostile' in p.character.conditions)).toBe(true)
    expect(tripAvailability(options, hostile).travel).toEqual({ value: 'beset', who: 'party' })
    // Met kindly: none of them is hostile (the reaction's effect reaches those the same entry
    // makes), and the Company may march on, or talk.
    let s = met(/they are (friendly|willing to talk|eager to help)$/)
    expect(s.present!.length).toBeGreaterThanOrEqual(2)
    expect(s.present!.some((p) => 'hostile' in p.character.conditions)).toBe(false)
    expect(s.party!.conditions).not.toHaveProperty('beset')
    expect(tripAvailability(options, s).travel).toBeUndefined()
    // Steel out: they're hostile again, and the fight is on.
    s = stepTrip(options, s, { type: 'action', id: 'stand' }).state
    expect(s.present!.every((p) => 'hostile' in p.character.conditions)).toBe(true)
    expect(s.party!.conditions).toHaveProperty('beset')
  })
})

describe('the bundled packs fight in turns', () => {
  /** Plays a fight to its end: each companion's turn a Strike one down at the first foe here. */
  function fight(
    system: typeof marches,
    start: string,
    seed: string,
    /** More to begin with (`characters.kael.values.xp: 2`). */
    more: Record<string, number> = {},
  ) {
    const { session } = startTrip({
      system,
      location: 'a',
      members: people(system),
      seed,
      time: 9 * 60,
    })
    const options = {
      system,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(2) }),
    }
    let s = applyResult(
      session,
      { effects: { 'present.bandit': 2, 'present.foe': 2, ...more } },
      {},
      partyOf(system),
    )
    const lines: string[] = []
    const all: JournalEntry[] = []
    let done = stepTrip(options, s, { type: 'action', id: start })
    // The party beset by the foes here (its sheet's condition, held by itself): said as the
    // step begins, before the fight's own lines (and again as it ends, if the fight does).
    const beset = done.entries.filter((e) => /conditions\.beset$/.test(String(e.data?.path)))
    expect(beset.length).toBeGreaterThanOrEqual(1)
    done = { ...done, entries: done.entries.filter((e) => !beset.includes(e)) }
    const first = done.state.encounter?.order ?? []
    for (let turn = 0; turn < 60 && done.state.encounter; turn++) {
      lines.push(...done.entries.map((e) => e.code))
      all.push(...done.entries)
      s = done.state
      const foe = s.present!.find((p) => p.at === s.travel.location)!.character.id
      done = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe } })
      // Its ask: who to strike, answered with the one given.
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    lines.push(...done.entries.map((e) => e.code))
    all.push(...done.entries)
    return { state: done.state, lines, first, all }
  }

  it('the Grey Marches: Stand and fight, turns by what each one rolls, foes whose nerve breaks, over when none is left', () => {
    // (The example maps aren't loaded here.)
    expect(problems.filter((p) => !p.at?.includes('.maps.'))).toEqual([])
    expect(marches.encounter?.order).toEqual({
      by: 'participant',
      value: { party: '{{1d6 + acting.values.stealth}}', foes: '{{1d6 + acting.values.harm}}' },
    })
    const { state, lines } = fight(marches, 'stand', 'i')
    expect(lines[0]).toBe('ACTION_TAKEN')
    expect(lines).toContain('ENCOUNTER_STARTED')
    expect(lines.filter((l) => l === 'ENCOUNTER_TURN').length).toBeGreaterThan(2)
    // Kael rolls 1d6 and his Stealth (3), Mara 1d6 and hers (0), each bandit 1d6 and its Harm.
    const order = fight(marches, 'stand', 'i').first
    expect(order).toEqual(['kael', 'bandit', 'mara', 'bandit-2'])
    // Its end is a moment (Mind the mail's and A name made's), heard right after it; nobody
    // wears armour here.
    const ended = lines.indexOf('ENCOUNTER_ENDED')
    expect(lines[ended + 1]).toBe('MOMENT_REACHED')
    expect(state.encounter).toBeUndefined()
    expect(state.present?.filter((p) => p.at === state.travel.location) ?? []).toEqual([])
    // Rounds of a minute: time went on as the rounds came.
    const rounds = lines.filter((l) => l === 'ENCOUNTER_ROUND').length
    expect(state.travel.time).toBeGreaterThanOrEqual(9 * 60 + rounds - 1)
  })

  it("a foe's nerve breaks on its turn: 2d6 over its Morale and it runs", () => {
    let ran = 0
    const broke: JournalEntry[] = []
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { lines, all } = fight(marches, 'stand', seed)
      ran += lines.filter((l) => l === 'PRESENT_LEFT').length
      broke.push(
        ...all.filter((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'nerve-breaks'),
      )
    }
    expect(ran).toBeGreaterThan(0)
    // Why it broke is seen: the 2d6 its rule rolled, every die, over the Morale (7 at least).
    expect(broke.length).toBeGreaterThan(0)
    for (const e of broke) {
      const [dice] = e.data!.rolled as DiceResult[]
      expect(dice).toMatchObject({ expression: '2d6' })
      expect(dice!.terms.length).toBeGreaterThan(0)
      expect(dice!.total).toBeGreaterThan(6)
    }
  })

  it('Core: Fight, the party first, a Strike on each turn, over when no foe is left', () => {
    expect(core.encounter).toEqual({
      order: { by: 'side', first: 'party' },
      actions: ['strike'],
      aim: 'party.fighters.random',
      alliesAim: 'present.fighters.random',
      foes: 'table.foe-turn',
      ends: { 'present.fighters.count': 0 },
      skip: { 'acting.conditions': 'staggered' },
    })
    const { state, lines } = fight(core, 'fight', 'c')
    expect(lines.slice(0, 5)).toEqual([
      'ACTION_TAKEN',
      'SAID',
      'ENCOUNTER_STARTED',
      'ENCOUNTER_ROUND',
      'ENCOUNTER_TURN',
    ])
    expect(lines).toContain('ENCOUNTER_ENDED')
    expect(state.encounter).toBeUndefined()
  })

  it('Core: the hound called runs with the party, fights on its side and bites on its own turns', () => {
    const { session } = startTrip({
      system: core,
      location: 'a',
      members: people(core),
      seed: 'h',
      time: 9 * 60,
    })
    const options = {
      system: core,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    let done = stepTrip(options, session, { type: 'action', id: 'call-hound' })
    expect(done.state.present?.map((p) => [p.character.id, p.side])).toEqual([['hound', 'party']])
    // Once a day, and not while one runs with them.
    expect(tripAvailability(options, done.state)['call-hound']).toBeDefined()
    let s = applyResult(done.state, { effects: { 'present.foe': 3 } }, {}, partyOf(core))
    done = stepTrip(options, s, { type: 'action', id: 'fight' })
    expect(done.state.encounter?.order).toEqual(['kael', 'mara', 'hound', 'foe', 'foe-2', 'foe-3'])
    const all: JournalEntry[] = [...done.entries]
    for (let turn = 0; turn < 60 && done.state.encounter; turn++) {
      s = done.state
      const foe = fightersHere(s)[0]?.character.id
      done = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe } })
      all.push(...done.entries)
    }
    expect(done.state.encounter).toBeUndefined()
    const bites = all.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'core/hound-turn',
    )
    expect(bites.length).toBeGreaterThan(0)
    // The hound's turns are its own, aimed at a foe; the foes' at one of the party or the hound.
    const turns = all.filter((e) => e.code === 'ENCOUNTER_TURN')
    for (const t of turns.filter((e) => e.data?.id === 'hound'))
      expect(String(t.data?.target)).toMatch(/^foe/)
    for (const t of turns.filter((e) => /^foe/.test(String(e.data?.id)) && e.data?.target))
      expect(['kael', 'mara', 'hound']).toContain(t.data?.target)
  })

  it("Core: a foe's blow keeps the 1d6 its table asked for apart from the 1d3 of harm its row rolled", () => {
    const blow = rollUntil('core/foe-turn', 'blow', { encounter: { target: 'kael' } })
    const [node] = rolledNodes(blow)
    expect(node?.results?.map((r) => r.expression)).toEqual(['1d6', '1d3'])
    expect(node?.inside).toBe(1)
  })

  it('Core: a fight won gives each one standing 1 experience; at 3, a level, and at level 2, Tough', () => {
    const won = fight(core, 'fight', 'c')
    expect(won.state.present?.filter((p) => p.at === won.state.travel.location) ?? []).toEqual([])
    const standing = won.state.members!.filter((m) => (m.values.health as number) >= 1)
    expect(standing.length).toBeGreaterThan(0)
    for (const m of standing) expect(m.values).toMatchObject({ xp: 1, level: 1 })
    // Two already, and a third: a level up, the experience starting again, Tough given.
    const risen = fight(core, 'fight', 'c', {
      'characters.kael.values.xp': 2,
      'characters.mara.values.xp': 2,
    })
    const up = risen.state.members!.filter((m) => m.values.level === 2)
    expect(up.length).toBeGreaterThan(0)
    for (const m of up) {
      expect(m.values.xp).toBe(0)
      expect(m.items?.map((i) => i.id)).toContain('tough')
      expect(m.values.tough).toBe(1)
    }
    expect(
      risen.all.some((e) => e.code === 'SAID' && /goes up a level/.test(JSON.stringify(e.data))),
    ).toBe(true)
  })

  it('both start their fights with an action of their own: Stand and fight, Fight', () => {
    expect(fightStarters(marches.rules)).toEqual(['stand'])
    expect(fightStarters(core.rules)).toEqual(['fight'])
  })

  it('foes act on their turns: Core’s blow, the Marches’ wolves going for the weakest', () => {
    // Core: each foe's turn rolls the system's table, a blow at one of the party (when a foe
    // still stands by its turn: in some fights the party fells them all first).
    const blows = ['c', 'd', 'e', 'f', 'g'].filter((seed) =>
      fight(core, 'fight', seed).lines.includes('ORACLE_RESULT'),
    )
    expect(blows.length).toBeGreaterThan(0)
    // The Grey Marches: wolves with their leader (without it they run) and a bandit; the
    // wolves roll their own table, the bandit the system's.
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(3) }),
    }
    let s = applyResult(
      session,
      { effects: { 'present.pack-leader': 1, 'present.grey-wolf': 2, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    // Mara is hurt: the wolves that bite go for her.
    s = {
      ...s,
      members: s.members!.map((m) =>
        m.id === 'mara' ? { ...m, values: { ...m.values, health: 1 } } : m,
      ),
    }
    const tables: unknown[] = []
    const bitten: unknown[] = []
    let done = stepTrip(options, s, { type: 'action', id: 'stand' })
    for (let turn = 0; turn < 12 && done.state.encounter; turn++) {
      for (const e of done.entries)
        if (e.code === 'ORACLE_RESULT') {
          tables.push(e.data?.table)
          const value = e.data?.value as Record<string, unknown>
          if (e.data?.table === 'grey-marches/wolf-turn' && value.target) bitten.push(value.target)
        }
      // The Company strikes the wolves of the pack (not its leader, or they'd run), so the
      // others get their turns.
      const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
      const foe = (here.find((p) => p.character.id.startsWith('grey-wolf')) ?? here.at(-1))
        ?.character.id
      if (!foe) break
      done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    expect(tables).toContain('grey-marches/wolf-turn')
    expect(tables).toContain('grey-marches/foe-turn')
    // The first bite goes for her (once she falls, the next weakest is another).
    expect(bitten.length ? bitten[0] : 'mara').toBe('mara')
  })

  it("a blow at everyone: Core's sweep and the restless dead's chill, on each, read and rolled for each", () => {
    /** Plays a fight, foes rolled by hand with `total`, and the lines of `table`'s `row`. */
    const play = (
      system: typeof marches,
      foes: string,
      start: string,
      table: string,
      total: number,
      items = {},
    ) => {
      const { session } = startTrip({
        system,
        location: 'a',
        members: people(system),
        seed: 'x',
        time: 9 * 60,
      })
      const options = {
        system,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(4) }),
      }
      // Three of them: the party fells two a round at most, so one is left to act.
      const brought = applyResult(
        { ...session, rollWay: 'foes' },
        { effects: { [foes]: 3, ...items } },
        {},
        partyOf(system),
      )
      let done = stepTrip(options, brought, { type: 'action', id: start })
      const hits: { target: string; effects: Record<string, number> }[] = []
      for (let turn = 0; turn < 12 && done.state.encounter; turn++) {
        for (const e of done.entries)
          if (e.code === 'ORACLE_RESULT' && e.data?.table === table)
            hits.push(e.data.value as (typeof hits)[number])
        if (hits.length) break
        // The player's rolls: the foe's table with the total chosen, the rest (the dice inside
        // what it fell on, each one's harm) rolled for them.
        const yours = done.state.yours?.[0]
        if (yours) {
          done = stepTrip(
            options,
            done.state,
            yours.table === table && !yours.given
              ? { type: 'rolled', id: yours.id, total }
              : { type: 'resolveCheck', id: yours.id },
          )
          continue
        }
        const foe = done.state.present?.find((p) => p.at === done.state.travel.location)?.character
          .id
        if (!foe) break
        done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
      }
      return hits
    }
    // Core: a 6 is the sweep, at both of you, each losing their own 1d2.
    const sweep = play(core, 'present.foe', 'fight', 'core/foe-turn', 6)
    expect(sweep.map((h) => h.target)).toEqual(['kael', 'mara'])
    for (const h of sweep) {
      const lost = -Number(Object.values(h.effects)[0])
      expect(lost).toBeGreaterThanOrEqual(1)
      expect(lost).toBeLessThanOrEqual(2)
    }
    // The Grey Marches: a 5 is the grave's chill on all of the Company, 1d3 less each one's
    // armour: Kael's mail (2) leaves him at most 1.
    const chill = play(marches, 'present.barrow-dead', 'stand', 'grey-marches/dead-turn', 5, {
      'characters.kael.items.mail': 1,
    })
    expect(chill.map((h) => h.target)).toEqual(['kael', 'mara'])
    const [kael, mara] = chill.map((h) => -Number(Object.values(h.effects)[0]))
    expect(kael).toBeLessThanOrEqual(1)
    expect(mara).toBeGreaterThanOrEqual(1)
    expect(mara).toBeLessThanOrEqual(3)
  })

  it('the Grey Marches: foes rolled by hand, each turn waiting for the total the player rolled', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(3) }),
    }
    const s = applyResult(
      { ...session, rollWay: 'foes' },
      { effects: { 'present.pack-leader': 1, 'present.grey-wolf': 2, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    // The player's dice: a 6 for a wolf (it bites), a 1 for anyone else (it swings and misses).
    const asked: string[] = []
    const rows: string[] = []
    let done = stepTrip(options, s, { type: 'action', id: 'stand' })
    for (let turn = 0; turn < 30 && done.state.encounter; turn++) {
      for (const e of done.entries)
        if (e.code === 'ROLLED')
          for (const r of e.data?.rolls as { source: string; entry?: string; byHand?: true }[])
            if (r.byHand) rows.push(`${r.source}:${r.entry}`)
      const yours = done.state.yours?.[0]
      if (yours) {
        // A foe's turn (its table's dice, who rolls it); the party's own rolls, too.
        const foe = done.state.present?.some((p) => p.character.id === yours.who)
        if (foe) {
          expect(yours.dice).toBe('1d6')
          asked.push(yours.table)
        }
        const total = yours.table === 'grey-marches/wolf-turn' ? 5 : 1
        done = stepTrip(
          options,
          done.state,
          foe ? { type: 'rolled', id: yours.id, total } : { type: 'resolveCheck', id: yours.id },
        )
        continue
      }
      const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
      const foe = (here.find((p) => p.character.id.startsWith('grey-wolf')) ?? here.at(-1))
        ?.character.id
      if (!foe) break
      done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    expect(asked).toContain('grey-marches/wolf-turn')
    expect(asked).toContain('grey-marches/foe-turn')
    expect(new Set(rows)).toEqual(
      new Set(['grey-marches/wolf-turn:bite', 'grey-marches/foe-turn:miss']),
    )
  })

  it("the Grey Marches: a foe's turn goes for one of you, chosen first, whose armour takes its roll down", () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'm',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(6) }),
    }
    // Both in mail (armour 2): whoever it goes for, the swing is 1d6 - 2.
    const s = applyResult(
      { ...session, rollWay: 'foes', foesAtOnce: true },
      {
        effects: {
          'present.bandit': 1,
          'characters.kael.items.mail': 1,
          'characters.mara.items.mail': 1,
        },
      },
      {},
      partyOf(marches),
    )
    // Enraged, its nerve never breaks: its turn comes.
    const enraged = applyResult(
      s,
      { effects: { 'characters.bandit.conditions.enraged': true } },
      {},
      partyOf(marches),
    )
    let done = stepTrip(options, enraged, { type: 'encounter', what: 'start' })
    for (let turn = 0; turn < 20 && done.state.encounter; turn++) {
      const yours = done.state.yours?.[0]
      if (yours?.table === 'grey-marches/foe-turn') {
        const aimed = done.state.journal.findLast((e) => e.code === 'ENCOUNTER_TURN')
        expect(['kael', 'mara']).toContain(aimed?.data?.target)
        expect(yours.dice).toBe('1d6 - 2')
        return
      }
      // The companions' own blows: a 1, so the bandit lives to strike back.
      if (yours) done = stepTrip(options, done.state, { type: 'rolled', id: yours.id, total: 1 })
      else if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: 'bandit' })
      else
        done = stepTrip(options, done.state, {
          type: 'action',
          id: 'strike',
          with: { foe: 'bandit' },
        })
    }
    throw new Error("the bandit's turn never came")
  })

  it('the Grey Marches: renown for a fight won, a rank risen at three times it, a knack learnt and used', () => {
    // A fight won: each companion still standing gains a renown.
    const won = fight(marches, 'stand', 'i')
    for (const m of won.state.members!.filter((m) => (m.values.health as number) >= 1))
      expect(m.values.renown).toBe(1)
    // Kael at three renown (rank 1): he rises on the next step, and chooses what he gains.
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'k',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const ready = applyResult(
      session,
      { effects: { 'characters.kael.values.renown': 3 } },
      {},
      partyOf(marches),
    )
    let done = stepTrip(options, ready, { type: 'action', id: 'rest' })
    expect(done.state.travel.waiting).toMatchObject({ action: 'rank-up', ask: 'benefit' })
    done = stepTrip(options, done.state, { type: 'resume', choice: 'knack' })
    // The knacks he may learn at rank 2: all but Pathfinder (it needs rank 3).
    expect(done.state.travel.waiting).toMatchObject({
      ask: 'knack',
      choices: ['woodwise', 'shieldwall', 'night-eyes'],
    })
    done = stepTrip(options, done.state, { type: 'resume', choice: 'shieldwall' })
    const kael = done.state.members!.find((m) => m.id === 'kael')!
    expect(kael.values).toMatchObject({ rank: 2, renown: 0, shieldwall: 1 })
    expect(kael.items!.map((i) => [i.id, i.place])).toContainEqual(['shieldwall', 'knacks'])
    // In a fight, on his turn, Shieldwall is his: braced, and a foe going for him rolls worse.
    let fought = stepTrip(
      options,
      applyResult(
        { ...done.state, foesAtOnce: true },
        { effects: { 'present.bandit': 1, 'characters.bandit.conditions.enraged': true } },
        {},
        partyOf(marches),
      ),
      { type: 'encounter', what: 'start' },
    )
    for (let i = 0; i < 10 && fought.state.acting !== 'kael'; i++)
      fought = stepTrip(options, fought.state, {
        type: 'action',
        id: 'strike',
        with: { foe: 'bandit' },
      })
    expect(fought.state.acting).toBe('kael')
    expect(tripAvailability(options, fought.state).shieldwall).toBeUndefined()
    fought = stepTrip(options, fought.state, { type: 'action', id: 'shieldwall' })
    const braced = fought.state.journal.find(
      (e) => e.code === 'CHANGED' && e.data?.path === 'characters.kael.conditions.braced',
    )
    expect(braced).toBeDefined()
    // Mara has no such knack: hidden on her turn.
    const mara = { ...fought.state, acting: 'mara' }
    expect(tripAvailability(options, mara).shieldwall).toBeDefined()
  })

  it('the Grey Marches: a Woodwise companion finds the way under the trees with advantage', () => {
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const mode = (context: Record<string, unknown>) =>
      oracle.resolve('grey-marches/getting-lost', context).resolution.mode
    const forest = { place: { terrain: 'forest' }, trip: { weather: 'clear' } }
    expect(mode(forest)).toBeUndefined()
    expect(mode({ ...forest, party: { highest: { values: { woodwise: 1 } } } })).toBe(
      'core/advantage',
    )
  })

  it('the Grey Marches: night eyes, a knack switched on and off, save a torch for a step of nerve', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'n',
      time: 21 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    let s = applyResult(
      session,
      {
        effects: {
          'characters.kael.items.night-eyes': 1,
          'characters.kael.items.torch': 1,
          'characters.mara.items.torch': 1,
        },
      },
      {},
      partyOf(marches),
    )
    const member = (state: SessionState, id: string) => state.members!.find((m) => m.id === id)!
    const torch = (state: SessionState, id: string) =>
      member(state, id).items!.find((i) => i.id === 'torch')?.fields.uses
    // Learnt idle: the knack is there, its field 0; only Open is offered, and only Kael.
    expect(member(s, 'kael').items!.find((i) => i.id === 'night-eyes')?.fields).toMatchObject({
      active: 0,
    })
    expect(tripAvailability(options, s)['open-eyes']).toBeUndefined()
    expect(tripAvailability(options, s)['close-eyes']).toBeDefined()
    // Only Kael has the knack: he's the one, nothing asked.
    let done = stepTrip(options, s, { type: 'action', id: 'open-eyes' })
    expect(done.state.travel.waiting).toBeUndefined()
    s = done.state
    expect(member(s, 'kael').values['night-eyes']).toBe(1)
    expect(tripAvailability(options, s)['close-eyes']).toBeUndefined()
    // A night march: Mara's torch burns an hour, Kael's doesn't, but his nerve steps down.
    const nerve = member(s, 'kael').values.nerve
    s = stepTrip(options, s, { type: 'action', id: 'night-march' }).state
    expect(torch(s, 'mara')).toBe(2)
    expect(torch(s, 'kael')).toBe(3)
    expect(member(s, 'kael').values.nerve).toBe((nerve as number) - 2)
    // Closed again: the next one would burn his torch.
    done = stepTrip(options, s, { type: 'action', id: 'close-eyes' })
    expect(member(done.state, 'kael').values['night-eyes']).toBe(0)
  })

  it("the Grey Marches: a blow's kind, by what's in hand, against what the foe is", () => {
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const blow = (acting: Record<string, number>, foe: string[], dark = false) => {
      const out = oracle.resolve('grey-marches/blow', {
        params: { foe: 'f' },
        acting: { values: { 'relic-in-hand': 0, 'torch-in-hand': 0, ...acting } },
        characters: { f: { tags: foe, values: { health: 9 } } },
        time: { tags: dark ? ['dark'] : [] },
      })
      return out.resolution.text
    }
    expect(blow({}, ['beast'])).toMatch(/^\d harm, steel$/)
    expect(blow({}, ['undead', 'bone'])).toMatch(/: glancing off$/)
    // A torch in hand is fire in the dark only: wolves take it twice over, the Hunt not at all.
    expect(blow({ 'torch-in-hand': 1 }, ['fears-fire'])).toMatch(/steel$/)
    expect(blow({ 'torch-in-hand': 1 }, ['fears-fire'], true)).toMatch(/fire: twice over$/)
    expect(blow({ 'torch-in-hand': 1 }, ['fireproof'], true)).toBe('No harm, fire: it doesn’t burn')
    // The Sword of Keld is hallowed, whatever else is in hand.
    expect(blow({ 'relic-in-hand': 1, 'torch-in-hand': 1 }, ['bone', 'unhallowed'], true)).toMatch(
      /hallowed: twice over$/,
    )
  })

  it("the Grey Marches: a blow's harm is the player's, rolled with its roll mode", () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'b',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(5) }),
    }
    const s = applyResult(
      { ...session, rollWay: 'foes' },
      { effects: { 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    const health = (state: typeof s) =>
      state.present?.find((p) => p.character.id === 'bandit')?.character.values.health as number
    let done = stepTrip(options, s, { type: 'encounter', what: 'start' })
    let struck = false
    for (let turn = 0; turn < 20 && done.state.encounter && !struck; turn++) {
      const yours = done.state.yours?.[0]
      if (yours?.table === 'grey-marches/blow') {
        // A lone foe: the harm's 1d6 is rolled twice, the higher kept (Core's advantage).
        expect(yours.dice).toBe('1d6')
        expect(yours.how).toEqual({ repeat: 2, keep: 'highest' })
        const before = health(done.state)
        done = stepTrip(options, done.state, { type: 'rolled', id: yours.id, total: 4 })
        expect(health(done.state) ?? before - 4).toBe(before - 4)
        // How the fight tells it, in the system's words (its `told:`), in both its languages.
        const told = done.state.journal.findLast((e) => e.code === 'ACTION_TOLD')
        expect(told?.data?.text).toEqual({
          en: expect.stringMatching(/^(Kael|Mara) strikes at Bandit$/),
          // A copy keeps the name it was made with (this trip is in English).
          es: expect.stringMatching(/^(Kael|Mara) golpea a Bandit$/),
        })
        struck = true
      } else if (yours) done = stepTrip(options, done.state, { type: 'resolveCheck', id: yours.id })
      else {
        done = stepTrip(options, done.state, {
          type: 'action',
          id: 'strike',
          with: { foe: 'bandit' },
        })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: 'bandit' })
      }
    }
    expect(struck).toBe(true)
  })

  it('the Grey Marches: a fight started by hand with those here, shown in turns, and called off', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'h',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(2) }),
    }
    const s = applyResult(session, { effects: { 'present.bandit': 2 } }, {}, partyOf(marches))
    let done = stepTrip(options, s, { type: 'encounter', what: 'start' })
    expect(done.entries.map((e) => e.code)).toContain('ENCOUNTER_STARTED')
    // The panel: round 1, the four in the order rolled, someone's turn.
    const view = encounterView(done.state)!
    expect(view.round).toBe(1)
    expect(view.fighters.map((f) => f.id).sort()).toEqual(['bandit', 'bandit-2', 'kael', 'mara'])
    expect(view.fighters.filter((f) => f.acting)).toHaveLength(1)
    expect(tripAvailability(options, done.state).travel).toEqual({ encounter: 'fight' })
    // A strike asks whom: while it waits, the turn is still that one's.
    const acting = view.fighters.find((f) => f.acting)!.id
    done = stepTrip(options, done.state, { type: 'action', id: 'strike' })
    expect(done.state.travel.waiting?.ask).toBe('foe')
    const waiting = encounterView(done.state)!
    expect(waiting.fighters.find((f) => f.acting)?.id).toBe(acting)
    expect(waiting.fighters.find((f) => f.id === acting)?.done).toBe(false)
    done = stepTrip(options, done.state, { type: 'resume', choice: 'bandit' })
    done = stepTrip(options, done.state, { type: 'encounter', what: 'end' })
    expect(done.entries.map((e) => e.code)).toContain('ENCOUNTER_ENDED')
    expect(done.state.encounter).toBeUndefined()
    expect(encounterView(done.state)).toBeUndefined()
    // Called off, the bandits are still here: the Company is beset, and can't march away.
    expect(tripAvailability(options, done.state).travel).toEqual({ value: 'beset', who: 'party' })
  })

  it("for each member: the Marches' Mind the mail looks over every companion's mail after a fight, Core's Mend heals each one standing after a rest", () => {
    const begin = (system: typeof marches, effects: Record<string, unknown>) => {
      const { session } = startTrip({
        system,
        location: 'a',
        members: people(system),
        seed: 'e',
        time: 9 * 60,
      })
      const options = {
        system,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(5) }),
      }
      return { options, s: applyResult(session, { effects }, {}, partyOf(system)) }
    }
    // Both wear mail: each one's is rolled for after the fight, called off on whoever's turn.
    const fight = begin(marches, {
      'present.bandit': 1,
      'characters.kael.items.mail': 1,
      'characters.mara.items.mail': 1,
    })
    const started = stepTrip(fight.options, fight.s, { type: 'action', id: 'stand' })
    const mail = stepTrip(fight.options, started.state, { type: 'encounter', what: 'end' })
    expect(mail.entries.map((e) => e.code)).toContain('ENCOUNTER_ENDED')
    const rolled = mail.entries.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'grey-marches/wear-and-tear',
    )
    expect(rolled).toHaveLength(2)
    // Core: Kael hurt (1), Mara down (0): after a rest only Kael mends.
    const night = begin(core, {
      'characters.kael.values.health': '=1',
      'characters.mara.values.health': '=0',
    })
    const camped = stepTrip(night.options, night.s, { type: 'action', id: 'rest' })
    const health = (id: string) => camped.state.members!.find((m) => m.id === id)!.values.health
    expect(health('kael')).toBe(2)
    expect(health('mara')).toBe(0)
  })

  it("Core's place of abilities: Tough goes there and nowhere else, weighs nothing, and raises the most health", () => {
    const { session } = startTrip({ system: core, location: 'a', members: people(core), seed: 't' })
    const s = applyResult(
      session,
      {
        effects: {
          'characters.kael.items.rope': 3,
          'characters.kael.items.tough': 1,
          'characters.kael.values.health': '=9',
        },
      },
      {},
      partyOf(core),
    )
    const kael = s.members!.find((m) => m.id === 'kael')!
    // The rope in no place (Core's gear is a plain list), Tough among the abilities.
    expect(kael.items!.map((i) => [i.id, i.place])).toEqual([
      ['rope', undefined],
      ['tough', 'abilities'],
    ])
    // Tough: one more health at most, so 4 though 9 were asked for.
    expect(kael.values).toMatchObject({ tough: 1, health: 4, harm: 0 })
    // Mara, without it, stays at 3.
    expect(s.members!.find((m) => m.id === 'mara')!.values.health).toBe(3)
  })

  it('the Grey Marches: falling back, the clumsiest takes a blow from the fiercest; Core says how tough the toughest is', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'p',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    const s = applyResult(
      session,
      { effects: { 'present.bandit-chief': 1, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    const started = stepTrip(options, s, { type: 'action', id: 'stand' })
    const health = (st: typeof s, id: string) => st.members!.find((m) => m.id === id)!.values.health
    // The chief's Harm (2) is over Mara's Stealth (0): she takes the difference.
    const before = health(started.state, 'mara')
    const back = stepTrip(options, started.state, { type: 'action', id: 'fall-back' })
    expect(back.state.encounter).toBeUndefined()
    expect(health(back.state, 'mara')).toBe(before - 2)
    expect(health(back.state, 'kael')).toBe(health(started.state, 'kael'))

    const { session: trip } = startTrip({
      system: core,
      location: 'a',
      members: people(core),
      seed: 'c',
    })
    const foes = applyResult(trip, { effects: { 'present.foe': 2 } }, {}, partyOf(core))
    const toughest = Math.max(...foes.present!.map((p) => p.character.values.health))
    const said = stepTrip({ ...options, system: core }, foes, { type: 'action', id: 'fight' })
    expect(said.entries.find((e) => e.code === 'SAID')?.data?.text).toMatchObject({
      en: `The toughest of them has ${toughest} health.`,
      es: `El más duro de ellos tiene ${toughest} de salud.`,
    })
  })

  it('the Grey Marches: after a fight, each piece the companion acting wears rolls its wear die', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    // Kael acts, wearing two mail shirts: a new one (d8) and a worn one (d4).
    let s = applyResult(
      { ...session, acting: 'kael' },
      { effects: { 'present.bandit': 1, 'characters.kael.items.mail': 1 } },
      {},
      partyOf(marches),
    )
    const kael = s.members!.find((m) => m.id === 'kael')!
    kael.items = [
      ...kael.items!,
      { ...kael.items!.find((i) => i.id === 'mail')!, key: 'mail-2', fields: { wear: 4 } },
    ]
    const worn = (st: typeof s) =>
      st.members!.find((m) => m.id === 'kael')!.items!.filter((i) => i.place === 'body')
    expect(worn(s).map((i) => [i.key, i.fields.wear])).toEqual([
      ['mail', 8],
      ['mail-2', 4],
    ])
    let rolled = 0
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const play = { ...options, oracle: createOracleEngine({ registry, random: seeded(seed) }) }
      s = stepTrip(play, s, { type: 'action', id: 'stand' }).state
      const back = stepTrip(play, s, { type: 'action', id: 'fall-back' })
      const before = worn(s).map((i) => i.key)
      // One roll for each piece worn, in order, each of its own die.
      const rolls = back.entries
        .filter((e) => e.code === 'ROLLED' && e.data?.check === 'table.wear-and-tear')
        .map((e) => (e.data!.rolls as { entry: string }[])[0]!.entry)
      expect(rolls).toHaveLength(before.length)
      rolled += rolls.length
      // A piece ruined is the one its roll was for, thrown away by its key; the rest kept,
      // each still a die of its steps.
      const kept = before.filter((_, k) => rolls[k] !== 'ruined')
      expect(worn(back.state).map((i) => i.key)).toEqual(kept)
      for (const piece of worn(back.state)) expect([4, 6, 8]).toContain(piece.fields.wear)
      if (kept.length < before.length) return
      s = { ...back.state, travel: { ...back.state.travel } }
    }
    expect(rolled).toBeGreaterThan(0)
    throw new Error('the worn mail was never ruined in eight fights')
  })

  it('Core: a foe’s blow that lands takes the shield of whoever it hits a step down', () => {
    const dented: string[] = []
    for (const [n, seed] of ['c', 'd', 'e', 'f', 'g', 'h'].entries()) {
      const { session } = startTrip({ system: core, location: 'a', members: people(core), seed })
      const options = {
        system: core,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(n + 1) }),
      }
      const armed = applyResult(
        session,
        {
          effects: {
            'present.foe': 4,
            'characters.kael.items.shield': 1,
            'characters.mara.items.shield': 1,
          },
        },
        {},
        partyOf(core),
      )
      expect(armed.members!.map((m) => m.items![0].fields.wear)).toEqual([6, 6])
      let done = stepTrip(options, armed, { type: 'action', id: 'fight' })
      for (let turn = 0; turn < 30 && done.state.encounter; turn++) {
        for (const e of done.entries) {
          if (e.code === 'CHANGED' && /items\.shield\.wear$/.test(String(e.data?.path)))
            dented.push(`${e.data?.from}→${e.data?.to}`)
        }
        const foe = done.state.present?.find((p) => p.at === done.state.travel.location)?.character
          .id
        if (!foe) break
        done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
      }
    }
    // A d6 to a d4, and never further: the last of its steps.
    expect(dented).toContain('6→4')
    expect(dented.every((d) => d === '6→4')).toBe(true)
  })

  it("Core: a shield carried adds its guard (the sheet's plus), and a foe's blow loses that much", () => {
    const { session } = startTrip({ system: core, location: 'a', members: people(core), seed: 'g' })
    const armed = applyResult(
      session,
      { effects: { 'characters.kael.items.shield': 1 } },
      {},
      partyOf(core),
    )
    const sheet = partyOf(core).sheet!.def
    const [kael, mara] = armed.members!
    // Kept at 0; the shield adds 1 while Kael carries it, nothing to Mara.
    expect(kael.values.guard).toBe(0)
    expect(valuesNow(sheet, kael).guard).toBe(1)
    expect(valuesNow(sheet, mara).guard).toBe(0)
    // A blow of 1 to 3 at Kael is 0 to 2; at Mara, 1 to 3.
    const blows = (guard: number) =>
      [1, 2, 3, 4, 5, 6, 7, 8]
        .map((n) => {
          const r = createOracleEngine({ registry, random: seeded(n) }).resolve(
            'core/table.foe-turn',
            {
              encounter: { target: 'kael' },
              characters: { kael: { values: { guard } } },
            },
          ).resolution
          const effects = (r.value.effects ?? {}) as Record<string, unknown>
          return Number(effects['characters[encounter.target].values.health'] ?? NaN)
        })
        .filter((n) => !Number.isNaN(n))
    expect(blows(1).length).toBeGreaterThan(3)
    expect(new Set(blows(1).map((n) => -n))).toContain(0)
    expect(Math.max(...blows(1).map((n) => -n))).toBeLessThanOrEqual(2)
    expect(Math.min(...blows(1).map((n) => -n))).toBeGreaterThanOrEqual(0)
    expect(Math.min(...blows(0).map((n) => -n))).toBeGreaterThanOrEqual(1)
  })

  it("a roll mode on one roll of a generator: Core's contest, the Grey Marches' blow on a lone foe", () => {
    const contest = (edge: boolean) =>
      createOracleEngine({ registry, random: seeded(5) }).resolve('core/generator.contest', {
        edge,
      }).resolution
    // With an edge, yours is rolled twice (one kept, one discarded); theirs once.
    const rolls = (r: ReturnType<typeof contest>) => r.rolls.map((x) => x.discarded?.length ?? 0)
    expect(rolls(contest(true))).toEqual([1, 0])
    expect(rolls(contest(false))).toEqual([0, 0])

    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'b',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(6) }),
    }
    const s = applyResult(session, { effects: { 'present.bandit': 1 } }, {}, partyOf(marches))
    const foe = s.present![0].character
    // In a fight, on a companion's turn.
    const fight = stepTrip(options, s, { type: 'action', id: 'stand' })
    const before = fight.state.present!.find((p) => p.character.id === foe.id)!.character
    let done = stepTrip(options, fight.state, {
      type: 'action',
      id: 'strike',
      with: { foe: foe.id },
    })
    if (done.state.travel.waiting)
      done = stepTrip(options, done.state, { type: 'resume', choice: foe.id })
    const rolled = done.entries.find(
      (e) => e.code === 'ROLLED' && e.data?.check === 'generator.blow',
    )
    // Alone, by day: rolled twice, the higher kept, and taken from its health.
    const dice = (rolled?.data?.rolls as { dice: string[] }[])[0].dice[0]
    expect(dice).toMatch(/^1d6 →.*\(/)
    const harm = Number(/→ (\d+)/.exec(dice)![1])
    const left =
      done.state.present?.find((p) => p.character.id === foe.id)?.character.values.health ?? 0
    expect(left).toBe(Math.max(0, before.values.health - harm))
  })

  it("conditions given for a while: Core's staggered foe reels, the Grey Marches' rattled companion; both wear off", () => {
    const texts = (all: JournalEntry[]) => all.map((e) => JSON.stringify(e))
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const core1 = seeds.map((seed) => texts(fight(core, 'fight', seed).all))
    // A glancing 1 staggers a foe (Core's _A strike_), which loses its turn (the system's
    // `skip`); it wears off.
    expect(core1.some((t) => t.some((x) => x.includes('staggers')))).toBe(true)
    expect(core1.some((t) => t.some((x) => x.includes('ENCOUNTER_SKIPPED')))).toBe(true)
    expect(
      core1.some((t) => t.some((x) => x.includes('conditions.staggered') && x.includes('"to":0'))),
    ).toBe(true)
    // A heavy blow rattles a companion for 1d2 rounds; it wears off by itself.
    const marches1 = Array.from({ length: 40 }, (_, i) =>
      texts(fight(marches, 'stand', `m${i}`).all),
    )
    expect(marches1.some((t) => t.some((x) => x.includes('heavy blow')))).toBe(true)
    expect(
      marches1.some((t) => t.some((x) => x.includes('conditions.rattled') && x.includes('"to":0'))),
    ).toBe(true)
  })

  it('the Grey Marches: a wolf drags a companion down, and that one loses their next turn', () => {
    let lost = 0
    for (let n = 1; n <= 30 && !lost; n++) {
      const { session } = startTrip({
        system: marches,
        location: 'a',
        members: people(marches),
        seed: `d${n}`,
        time: 9 * 60,
      })
      const options = {
        system: marches,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(n) }),
      }
      const s = applyResult(
        session,
        // Enraged, their nerve never breaks: they bite on every turn.
        {
          effects: {
            'present.pack-leader': 1,
            'present.grey-wolf': 3,
            'present.all.conditions.enraged': true,
          },
        },
        {},
        partyOf(marches),
      )
      let done = stepTrip(options, s, { type: 'action', id: 'stand' })
      const all = [...done.entries]
      for (let turn = 0; turn < 8 && done.state.encounter; turn++) {
        const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
        const foe = here.find((p) => p.character.id.startsWith('grey-wolf'))?.character.id
        if (!foe) break
        done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
        all.push(...done.entries)
      }
      const dragged = all.findIndex(
        (e) => e.code === 'CHANGED' && String(e.data?.path).endsWith('conditions.dragged-down'),
      )
      if (dragged < 0) continue
      const who = String(all[dragged].data?.path).split('.')[1]
      // That one's next turn is lost, and the condition with it.
      const next = all.slice(dragged).find((e) => e.code === 'ENCOUNTER_TURN' && e.data?.id === who)
      if (!next) continue
      const after = all[all.indexOf(next) + 1]
      expect(after.code).toBe('ENCOUNTER_SKIPPED')
      lost++
    }
    expect(lost).toBe(1)
  })
})

describe('a turn of a fight and what it sets off', () => {
  const kael = () => [newMember(partyOf(marches), { id: 'kael', name: 'Kael' })]
  const options = (seed: number) => ({
    system: marches,
    world: heath,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
  })
  /** A fight of Kael's against one bandit at 1 health, played on to Kael's turn. */
  function toKaelsTurn(rollWay: 'mine' | 'all') {
    const { session } = startPaced({ system: marches, location: 'a', members: kael(), seed: 'b' })
    let s = applyResult(
      { ...session, rollWay, foesAtOnce: true },
      { effects: { 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    s = applyResult(
      s,
      { effects: { 'characters.bandit.values.health': '=1' } },
      {},
      partyOf(marches),
    )
    let done = stepTrip(options(5), s, { type: 'action', id: 'stand' })
    // Rolling everything, the foe's turn before Kael's may be the player's too.
    for (let i = 0; i < 6 && done.state.yours?.length; i++)
      done = stepTrip(options(5), done.state, { type: 'resolveCheck', id: done.state.yours[0]!.id })
    expect(encounterView(done.state)?.choosing).toBe(true)
    return done.state
  }

  it("my own rolls: the blow is the player's, the spoils of the one who fell the computer's", () => {
    let done = stepTrip(options(5), toKaelsTurn('mine'), {
      type: 'action',
      id: 'strike',
      with: { foe: 'bandit' },
    })
    expect(done.state.yours?.map((y) => y.table)).toEqual(['grey-marches/blow'])
    done = stepTrip(options(5), done.state, {
      type: 'rolled',
      id: done.state.yours![0]!.id,
      total: 3,
    })
    // The bandit fell and was stripped, nothing more asked: the fight is over.
    expect(done.state.yours ?? []).toEqual([])
    expect(done.entries.some((e) => e.data?.table === 'grey-marches/fallen')).toBe(true)
    expect(done.state.encounter).toBeUndefined()
  })

  it('I roll everything: the spoils are asked too', () => {
    let done = stepTrip(options(5), toKaelsTurn('all'), {
      type: 'action',
      id: 'strike',
      with: { foe: 'bandit' },
    })
    done = stepTrip(options(5), done.state, {
      type: 'rolled',
      id: done.state.yours![0]!.id,
      total: 3,
    })
    expect(done.state.yours?.map((y) => y.table)).toEqual(['grey-marches/fallen'])
  })

  it("a roll without chance is never the player's: Fall back's parting blow (1d1)", () => {
    const { session } = startPaced({ system: marches, location: 'a', members: kael(), seed: 'b' })
    const s = applyResult(
      { ...session, rollWay: 'all', foesAtOnce: true },
      { effects: { 'present.bandit-chief': 1 } },
      {},
      partyOf(marches),
    )
    let done = stepTrip(options(5), s, { type: 'action', id: 'stand' })
    for (let i = 0; i < 6 && done.state.yours?.length; i++)
      done = stepTrip(options(5), done.state, { type: 'resolveCheck', id: done.state.yours[0]!.id })
    done = stepTrip(options(5), done.state, { type: 'action', id: 'fall-back' })
    expect(done.entries.some((e) => e.data?.table === 'grey-marches/parting-blow')).toBe(true)
    expect(done.state.yours ?? []).toEqual([])
    expect(done.state.encounter).toBeUndefined()
  })

  it('the Grey Marches: one who fell loses their turns, and the fight is lost when none stands', () => {
    const { session } = startPaced({ system: marches, location: 'a', members: kael(), seed: 'b' })
    let s = applyResult(
      { ...session, foesAtOnce: true },
      { effects: { 'present.bandit-chief': 1, 'present.bandit': 2 } },
      {},
      partyOf(marches),
    )
    s = applyResult(s, { effects: { 'characters.kael.values.health': '=1' } }, {}, partyOf(marches))
    const morale = s.party!.values.morale as number
    let done = stepTrip(options(5), s, { type: 'action', id: 'stand' })
    const all = [...done.entries]
    for (let i = 0; i < 20 && done.state.encounter; i++) {
      const foe = done.state.present![0]!.character.id
      done = stepTrip(options(5), done.state, { type: 'action', id: 'strike', with: { foe } })
      all.push(...done.entries)
    }
    // Kael fell; from then on no turn of his was played, and the fight ended by itself.
    expect(done.state.encounter).toBeUndefined()
    const fell = all.findIndex((e) => e.data?.path === 'characters.kael.conditions.wounded')
    expect(fell).toBeGreaterThan(-1)
    const after = all.slice(fell)
    expect(after.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'strike')).toBe(false)
    expect(after.map((e) => e.code)).toContain('ENCOUNTER_ENDED')
    // Overcome: a morale less, and free to crawl away from the foes still here.
    expect(after.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'overcome')).toBe(true)
    expect(done.state.party!.values.morale).toBe(morale - 1)
    expect(done.state.party!.conditions).toHaveProperty('gave-ground')
    expect(done.state.present!.length).toBeGreaterThan(0)
  })
})

describe("things present that don't fight", () => {
  const road: TravelWorld = {
    km: () => 1,
    place: () => ({ terrain: 'plains' }),
    neighbors: (id) => (id === 'a' ? ['b'] : ['a']),
    distance: () => 1,
    connections: () => ['road'],
  }

  it('Core: a locked chest besets nobody and fights nobody; forced, then opened, it gives food', () => {
    const options = {
      system: core,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const rules = partyOf(core)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: core, location: 'a', seed: 'c', time: 9 * 60, members })
    let s = settleTrip(
      options,
      applyResult(session, { effects: { 'present.chest': 1 } }, {}, rules),
    ).state
    expect(s.present).toEqual([expect.objectContaining({ fights: false })])
    expect(tripFacts(options, s).present).toMatchObject({ count: 1, fighters: { count: 0 } })
    const open = tripAvailability(options, s)
    // Not beset, no fight, nothing to get away from.
    expect(open.travel).toBeUndefined()
    expect(open.fight).toMatchObject({ condition: 'when' })
    expect(open['get-away']).toMatchObject({ condition: 'when' })
    expect(open['force-chest']).toBeUndefined()
    // Locked: Open it lists no chest, so nothing opens.
    s = stepTrip(options, s, { type: 'action', id: 'open-chest' }).state
    expect(s.present).toHaveLength(1)
    const food = s.party!.values.food
    for (let n = 0; n < 20 && s.present![0].character.conditions.locked; n++)
      s = stepTrip(options, s, {
        type: 'action',
        id: 'force-chest',
        with: { chest: 'chest' },
      }).state
    expect(s.present![0].character.conditions).not.toHaveProperty('locked')
    expect(tripAvailability(options, s)['force-chest']).toMatchObject({ condition: 'when' })
    s = stepTrip(options, s, { type: 'action', id: 'open-chest', with: { chest: 'chest' } }).state
    expect(s.present ?? []).toEqual([])
    expect(s.party!.values.food).toBe(food + 1)
  })

  it('Core: a chest beside a foe stays out of the fight, which ends with the foe', () => {
    const options = {
      system: core,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const rules = partyOf(core)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: core, location: 'a', seed: 'c', time: 9 * 60, members })
    let s = applyResult(
      { ...session, foesAtOnce: true },
      { effects: { 'present.chest': 1, 'present.foe': 1 } },
      {},
      rules,
    )
    s = stepTrip(options, s, { type: 'action', id: 'fight' }).state
    expect(s.encounter!.order).toEqual(['kael', 'foe'])
    for (let n = 0; n < 30 && s.encounter; n++)
      s = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe: 'foe' } }).state
    expect(s.encounter).toBeUndefined()
    expect(s.present!.map((p) => p.character.id)).toEqual(['chest'])
  })

  it('the Grey Marches: a grave-goods chest found in a crypt, looked over, picked or broken, and opened', () => {
    const rules = partyOf(marches)
    const crypt = rollUntil('grey-marches/table.crypt-contents', 'grave-goods', {})
    expect(crypt.value.effects).toEqual({ 'present.grave-chest': 1 })
    const members = [
      newMember(rules, { id: 'kael', name: 'Kael', values: { survival: 2, stealth: 3 } }),
      newMember(rules, { id: 'mara', name: 'Mara' }),
    ]
    const options = {
      system: marches,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    const opened: number[] = []
    const kinds = new Set<string>()
    for (const [i, seed] of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].entries()) {
      const { session } = startTrip({ system: marches, location: 'a', seed, time: 9 * 60, members })
      // Kael and Mara by turns: Mara has neither Survival nor Stealth to speak of.
      const who = i % 2 ? 'mara' : 'kael'
      let s = settleTrip(options, {
        ...applyResult(session, crypt.value, {}, rules),
        acting: who,
      }).state
      const health = () => s.members!.find((m) => m.id === who)!.values.health
      const chest = () => s.present?.find((p) => p.character.template?.id === 'grave-chest')
      expect(chest()).toMatchObject({ fights: false, character: { sheet: 'grey-marches/chest' } })
      const { lock, needle } = chest()!.character.values
      expect(lock).toBeGreaterThanOrEqual(0)
      expect(lock).toBeLessThanOrEqual(4)
      expect(needle).toBeGreaterThanOrEqual(0)
      expect(needle).toBeLessThanOrEqual(2)
      expect(Object.keys(chest()!.character.conditions).sort()).toEqual(
        [...(lock ? ['locked'] : []), ...(needle ? ['needled'] : [])].sort(),
      )
      const open = tripAvailability(options, s)
      // A thing: not beset, nothing to stand and fight or drive off.
      expect(open.travel).toBeUndefined()
      expect(open.stand).toMatchObject({ condition: 'when' })
      expect(open['drive-off']).toMatchObject({ condition: 'when' })
      const closed = (yes: number) =>
        yes ? undefined : expect.objectContaining({ condition: 'when' })
      expect(open['look-chest']).toEqual(closed(needle))
      expect(open['pick-chest']).toEqual(closed(lock))
      expect(open['break-chest']).toEqual(closed(lock))
      const take = (id: string) => {
        const done = stepTrip(options, s, { type: 'action', id, with: { chest: 'grave-chest' } })
        s = done.state
        // What the noise brought stops the trip: on with it.
        const entries = [...done.entries]
        while (s.travel.pendingChecks.length) {
          const on = stepTrip(options, s, {
            type: 'resolveCheck',
            id: s.travel.pendingChecks[0].id,
          })
          s = on.state
          entries.push(...on.entries)
        }
        return entries
      }
      if (needle) {
        const before = health()
        take('look-chest')
        kinds.add(health() < before ? 'pricked' : 'drawn')
        expect(chest()!.character.values.needle).toBe(0)
      }
      // Kael picks it, a few times; Mara breaks it open, waking the noise.
      for (let n = 0; n < 3 && who === 'kael' && chest()!.character.values.lock; n++)
        take('pick-chest')
      if (chest()!.character.values.lock) {
        const lines = take('break-chest')
        expect(lines.some((e) => e.data?.event === 'table.door-noise')).toBe(true)
        kinds.add('broken')
      }
      const silver = s.party!.values.silver
      const lines = take('open-chest')
      expect(chest()).toBeUndefined()
      expect(lines.some((e) => e.data?.event === 'table.chest-goods')).toBe(true)
      opened.push(s.party!.values.silver - silver)
    }
    expect(opened).toHaveLength(10)
    expect(opened.some((n) => n > 0)).toBe(true)
    expect([...kinds].sort()).toEqual(['broken', 'drawn', 'pricked'])
  })

  it('the Grey Marches: travellers and a chest beside bandits are no side of the fight', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const options = {
      system: marches,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const { session } = startTrip({
      system: marches,
      location: 'a',
      seed: 'f',
      time: 9 * 60,
      members,
    })
    let s = applyResult(
      { ...session, acting: 'kael' },
      { effects: { 'present.grave-chest': 1, 'present.traveller': 1, 'present.bandit': 1 } },
      {},
      rules,
    )
    expect(tripFacts(options, s).present).toMatchObject({ count: 3, fighters: { count: 1 } })
    // Every one here routed (Driving them off): the bandit runs; the chest has no such
    // condition on its sheet, and stays.
    const routed = settleTrip(
      options,
      applyResult(s, { effects: { 'present.all.conditions.routed': true } }, {}, rules),
    ).state
    expect(routed.present!.map((p) => p.character.id)).toEqual(['grave-chest', 'traveller'])
    s = stepTrip(options, s, { type: 'action', id: 'stand' }).state
    expect(s.encounter!.order.filter((id) => id !== 'kael')).toEqual(['bandit'])
  })
})
