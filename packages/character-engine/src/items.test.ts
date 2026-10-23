import { describe, expect, it } from 'vitest'
import {
  applyCharacter,
  characterFacts,
  createCharacter,
  itemFromCatalogue,
  lookupItems,
  parseCatalogue,
  parseSheet,
  shareItems,
  type CharacterState,
  type Sheet,
} from './index'

// A made-up sheet: slots against a capacity made of might, places by tags, uses that run
// out, a load made of the items and a condition that holds while it's over.
const { sheet, errors } = parseSheet({
  kind: 'sheet',
  id: 'delver',
  values: {
    might: { default: 2 },
    capacity: { from: '{{self.values.might * 2 + 2}}' },
    load: { from: { sum: 'items.slots', where: { 'item.inside': false } } },
    armour: { from: { max: 'items.armour', where: { 'place.tags': 'worn' } } },
    lights: { from: { count: 'items', where: { 'item.tags': 'light' } } },
  },
  conditions: {
    encumbered: { when: { 'self.values.load': { gt: '{{self.values.capacity}}' } } },
  },
  items: {
    fields: {
      slots: { default: 1, min: 0 },
      uses: { min: 0, max: 3, display: 'pips', spent: true },
      armour: { min: 0 },
    },
    places: {
      hands: { tags: ['hand'], room: 2 },
      body: { tags: ['worn'], room: 1 },
      pack: { tags: ['pack'], room: '{{self.values.capacity}}' },
    },
    size: 'slots',
  },
})

const catalogue = parseCatalogue({
  kind: 'items',
  id: 'gear',
  items: {
    rope: { name: 'Rope', slots: 1, tags: ['climbing'] },
    torch: { name: 'Torch', slots: 1, uses: 3, tags: ['light'] },
    mail: { name: 'Mail', slots: 2, armour: 2, fits: { 'place.tags': 'worn' } },
    sack: { name: 'Sack', slots: 1, holds: { room: 4, tags: ['pack'] } },
  },
})
const lookup = lookupItems([{ id: 'test/gear', def: catalogue.catalogue! }])
const from = (id: string, count = 1) =>
  itemFromCatalogue(sheet!.items, 'test/gear', id, lookup(id)!.item, count)

const delver = (): CharacterState => createCharacter(sheet!, 'test/delver', { id: 'mira' })
const act = (s: CharacterState, action: Parameters<typeof applyCharacter>[2]) =>
  applyCharacter(sheet as Sheet, s, action, { items: lookup })

describe('items', () => {
  it('are read from the sheet and a catalogue', () => {
    expect(errors).toEqual([])
    expect(catalogue.errors).toEqual([])
    expect(
      parseSheet({ kind: 'sheet', id: 'x', items: { fields: { count: {} }, size: 'weight' } })
        .errors,
    ).toEqual([
      'items.fields.count: "count" is a key every item has; name the field otherwise',
      'items.size: no item field "weight" (items.fields)',
    ])
    expect(
      parseSheet({ kind: 'sheet', id: 'x', values: { a: { from: { sum: 'items.weight' } } } })
        .errors,
    ).toEqual(['values.a.from.sum: no item field "weight" on this sheet (items.fields)'])
    expect(parseCatalogue({ kind: 'items', id: 'x', items: { tags: {} } }).errors[0]).toMatch(
      /can't be an item's id/,
    )
  })

  it('go to the first place they fit with room, stacked when alike', () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: from('rope') }).state
    s = act(s, { type: 'addItem', item: from('rope') }).state
    expect(s.items).toEqual([
      expect.objectContaining({ key: 'rope', count: 2, place: 'hands', fields: { slots: 1 } }),
    ])
    // The mail fits only the body; hands and body full, the torch goes to the pack.
    s = act(s, { type: 'addItem', item: from('mail') }).state
    s = act(s, { type: 'addItem', item: from('torch') }).state
    expect(s.items!.map((i) => [i.key, i.place])).toEqual([
      ['rope', 'hands'],
      ['mail', 'body'],
      ['torch', 'pack'],
    ])
    expect(s.items![2].start).toEqual({ uses: 3 })
    // What's made of them, and the condition that holds while the load is over.
    expect(s.values).toMatchObject({ capacity: 6, load: 5, armour: 2, lights: 1 })
    expect(s.conditions.encumbered).toBeUndefined()
    s = act(s, { type: 'change', effects: { 'items.rope': '+2' } }).state
    expect(s.values.load).toBe(7)
    expect(s.conditions.encumbered).toEqual({})
  })

  it("refuse a place they don't fit, and never inside themselves", () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: from('mail') }).state
    const refused = act(s, { type: 'moveItem', key: 'mail', place: 'hands' })
    expect(refused.events).toEqual([
      { type: 'ITEM_DOESNT_FIT', character: 'mira', item: 'mail', key: 'mail', place: 'hands' },
    ])
    s = act(s, { type: 'addItem', item: { ...from('sack'), place: 'pack' } }).state
    s = act(s, { type: 'addItem', item: { ...from('sack'), place: 'sack' } }).state
    expect(s.items!.find((i) => i.key === 'sack-2')?.place).toBe('sack')
    expect(act(s, { type: 'moveItem', key: 'sack', place: 'sack-2' }).events[0].type).toBe(
      'ITEM_DOESNT_FIT',
    )
  })

  it('in a container travel with it and count as its carrier says', () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: { ...from('sack'), place: 'pack' } }).state
    s = act(s, { type: 'addItem', item: { ...from('rope', 3), place: 'sack' } }).state
    // The load counts what isn't inside something (`where: { 'item.inside': false }`).
    expect(s.values.load).toBe(1)
    const facts = characterFacts(s, sheet)
    expect(facts.places).toMatchObject({
      pack: { room: 6, used: 1, items: ['sack'] },
      sack: { room: 4, used: 3, items: ['rope'], tags: ['pack'] },
    })
    const gone = act(s, { type: 'removeItem', key: 'sack' })
    expect(gone.state.items).toEqual([])
    expect(gone.events.map((e) => e.type)).toEqual([
      'ITEM_REMOVED',
      'ITEM_REMOVED',
      'VALUE_CHANGED',
    ])
  })

  it('are given, spent and taken by effects', () => {
    let s = delver()
    // None yet: from the catalogue.
    let done = act(s, { type: 'change', effects: { 'items.torch': 2 } })
    s = done.state
    expect(done.events[0]).toEqual({
      type: 'ITEM_ADDED',
      character: 'mira',
      item: 'torch',
      key: 'torch',
      count: 2,
    })
    // Uses run out: one torch is spent, the next starts again.
    s = act(s, { type: 'change', effects: { 'items.torch.uses': -3 } }).state
    expect(s.items![0]).toMatchObject({ count: 1, fields: { uses: 3 } })
    done = act(s, { type: 'change', effects: { 'items.torch.uses': '=0' } })
    expect(done.events.map((e) => e.type).filter((t) => t.startsWith('ITEM'))).toEqual([
      'ITEM_CHANGED',
      'ITEM_SPENT',
      'ITEM_REMOVED',
    ])
    expect(done.state.items).toEqual([])
    // Unknown ones say so; a field of one it hasn't got changes nothing.
    expect(act(s, { type: 'change', effects: { 'items.wand': 1 } }).events).toEqual([
      { type: 'UNKNOWN_ITEM', character: 'mira', item: 'wand' },
    ])
    expect(act(s, { type: 'change', effects: { 'items.rope.uses': -1 } }).events).toEqual([])
  })

  it('take fewer from the last ones first', () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: { ...from('rope', 2), place: 'hands' } }).state
    s = act(s, { type: 'addItem', item: { ...from('rope', 2), place: 'pack' } }).state
    s = act(s, { type: 'change', effects: { 'items.rope': -3 } }).state
    expect(s.items!.map((i) => [i.key, i.count])).toEqual([['rope', 1]])
  })

  it('are read by conditions and tables', () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: from('torch', 2) }).state
    s = act(s, {
      type: 'addItem',
      item: { id: 'compass', name: "Grandfather's compass", count: 1, tags: ['heirloom'] },
    }).state
    const facts = characterFacts(s, sheet) as { items: Record<string, unknown> }
    expect(facts.items.torch).toMatchObject({ count: 2, uses: 3, slots: 1, tags: ['light'] })
    expect(facts.items.compass).toMatchObject({ count: 1, slots: 1 })
    expect(facts.items.tags).toEqual(['light', 'heirloom'])
  })

  it('are edited by hand, and places of its own added', () => {
    let s = delver()
    s = act(s, { type: 'addItem', item: from('torch') }).state
    s = act(s, {
      type: 'editItem',
      key: 'torch',
      count: '=4',
      name: 'Pitch torch',
      fields: { uses: -1 },
    }).state
    expect(s.items![0]).toMatchObject({ count: 4, name: 'Pitch torch', fields: { uses: 2 } })
    s = act(s, {
      type: 'setPlace',
      id: 'tail',
      place: { name: 'Tail', tags: ['hand'], room: 1 },
    }).state
    s = act(s, { type: 'moveItem', key: 'torch', place: 'tail' }).state
    expect(s.items![0].place).toBe('tail')
    s = act(s, { type: 'setPlace', id: 'tail', place: null }).state
    expect(s.places).toBeUndefined()
    expect(s.items![0].place).toBeUndefined()
  })

  it('shares what the party spends or gains out among its members', () => {
    const band = () =>
      [
        ['mira', 3],
        ['kael', 1],
        ['oro', 0],
      ].map(([id, torches]) => {
        let m = createCharacter(sheet!, 'test/delver', { id: id as string })
        if (torches) m = act(m, { type: 'change', effects: { 'items.rope': torches } }).state
        return m
      })
    const counts = (ms: CharacterState[]) =>
      ms.map((m) => (m.items ?? []).reduce((n, i) => n + i.count, 0))
    // Even: taken from whoever has most, one at a time; given to whoever has least.
    const taken = shareItems(() => sheet, band(), 'rope', -3, 'even', { items: lookup })
    expect(counts(taken.members)).toEqual([0, 1, 0])
    expect(taken.left).toBe(0)
    const given = shareItems(() => sheet, band(), 'rope', 3, 'even', { items: lookup })
    expect(counts(given.members)).toEqual([3, 2, 2])
    // More than they have: what's left stays undone.
    const tooMuch = shareItems(() => sheet, band(), 'rope', -6, 'even', { items: lookup })
    expect(counts(tooMuch.members)).toEqual([0, 0, 0])
    expect(tooMuch.left).toBe(2)
    expect(tooMuch.events).toContainEqual(
      expect.objectContaining({ type: 'ITEM_REMOVED', character: 'mira', item: 'rope' }),
    )
    // In order: the first member first.
    const inOrder = shareItems(() => sheet, band(), 'rope', -2, 'order', { items: lookup })
    expect(counts(inOrder.members)).toEqual([1, 1, 0])
    const gainOrder = shareItems(() => sheet, band(), 'rope', 2, 'order', { items: lookup })
    expect(counts(gainOrder.members)).toEqual([5, 1, 0])
    // What holds by itself follows: seven ropes are past a capacity of 6.
    const loaded = shareItems(() => sheet, band(), 'rope', 4, 'order', { items: lookup })
    expect(loaded.members[0].conditions.encumbered).toEqual({})
  })
})

describe('room a place refuses to go over', () => {
  // The same sheet, but its places take no more than their room, but for the sack.
  const strict = parseSheet({
    kind: 'sheet',
    id: 'strict',
    values: { might: { default: 2 } },
    items: {
      fields: { slots: { default: 1, min: 0 } },
      places: {
        hands: { tags: ['hand'], room: 2 },
        belt: { tags: ['belt'], room: 1, over: 'allow' },
        back: { tags: ['back'], room: 1 },
      },
      size: 'slots',
      over: 'refuse',
    },
  }).sheet!
  const gear = lookupItems([
    {
      id: 'test/gear',
      def: parseCatalogue({
        kind: 'items',
        id: 'gear',
        items: {
          rope: { slots: 1 },
          stone: { slots: 1, fits: { 'place.tags': ['hand', 'back', 'pack'] } },
          sack: { slots: 1, fits: { 'place.tags': 'back' }, holds: { room: 2, tags: ['pack'] } },
        },
      }).catalogue!,
    },
  ])
  const give = (id: string, count = 1) =>
    itemFromCatalogue(strict.items, 'test/gear', id, gear(id)!.item, count)
  const run = (s: CharacterState, action: Parameters<typeof applyCharacter>[2]) =>
    applyCharacter(strict, s, action, { items: gear })
  const fresh = () => createCharacter(strict, 'test/strict', { id: 'mira' })

  it('are read from the sheet, a place and a container', () => {
    expect(parseSheet({ kind: 'sheet', id: 'x', items: { over: 'never' } }).errors[0]).toMatch(
      /^items\.over/,
    )
    expect(
      parseCatalogue({ kind: 'items', id: 'x', items: { a: { holds: { over: 'refuse' } } } })
        .errors,
    ).toEqual([])
  })

  it('send what has no room left to the next place, a container, then the one that allows', () => {
    let s = fresh()
    s = run(s, { type: 'addItem', item: give('sack') }).state
    s = run(s, { type: 'addItem', item: give('rope', 2) }).state
    s = run(s, { type: 'addItem', item: give('stone') }).state
    expect(s.items!.map((i) => [i.key, i.place, i.count])).toEqual([
      ['sack', 'back', 1],
      ['rope', 'hands', 2],
      // Hands full, the back too, and it fits no belt: the sack has room.
      ['stone', 'sack', 1],
    ])
    // Belt (1), then the sack's last slot; then only the belt takes more than its room.
    s = run(s, { type: 'change', effects: { 'items.rope': '+3' } }).state
    expect(s.items!.map((i) => [i.key, i.place, i.count])).toEqual([
      ['sack', 'back', 1],
      ['rope', 'hands', 2],
      ['stone', 'sack', 1],
      ['rope-2', 'belt', 3],
    ])
  })

  it('leave what fits nowhere with room in no place, and say so', () => {
    let s = fresh()
    // Three stones at once fit no place that refuses (hands 2, back 1), and none allows them.
    const three = run(s, { type: 'addItem', item: give('stone', 3) })
    expect(three.state.items!.map((i) => [i.key, i.place])).toEqual([['stone', undefined]])
    expect(three.events).toContainEqual({ type: 'ITEM_NO_ROOM', character: 'mira', item: 'stone' })
    // One at a time: the hands, then the back, then nowhere.
    for (let n = 0; n < 4; n++)
      s = run(s, { type: 'change', effects: { 'items.stone': '+1' } }).state
    expect(s.items!.map((i) => [i.key, i.place, i.count])).toEqual([
      ['stone', 'hands', 2],
      ['stone-2', 'back', 1],
      ['stone-3', undefined, 1],
    ])
  })

  it('refuse a move there, unless it allows it', () => {
    let s = fresh()
    s = run(s, { type: 'addItem', item: { ...give('rope', 3), place: 'belt' } }).state
    expect(s.items![0].place).toBe('belt')
    const refused = run(s, { type: 'moveItem', key: 'rope', place: 'hands' })
    expect(refused.events).toEqual([
      { type: 'ITEM_NO_ROOM', character: 'mira', item: 'rope', key: 'rope', place: 'hands' },
    ])
    // Two of them fit the hands: moved one at a time, each a stack of its own there.
    s = run(s, { type: 'moveItem', key: 'rope', place: 'hands', count: 1 }).state
    s = run(s, { type: 'moveItem', key: 'rope', place: 'hands', count: 1 }).state
    expect(s.items!.map((i) => [i.key, i.place, i.count])).toEqual([
      ['rope', 'belt', 1],
      ['rope-2', 'hands', 2],
    ])
    expect(run(s, { type: 'moveItem', key: 'rope', place: 'hands' }).events[0].type).toBe(
      'ITEM_NO_ROOM',
    )
    // One taken out of every place, apart from the rest.
    s = run(s, { type: 'moveItem', key: 'rope-2', place: undefined, count: 1 }).state
    expect(s.items!.map((i) => [i.key, i.place, i.count])).toEqual([
      ['rope', 'belt', 1],
      ['rope-2', 'hands', 1],
      ['rope-3', undefined, 1],
    ])
    // Put by hand where there's no room: it's kept, in no place.
    const put = run(s, { type: 'addItem', item: { ...give('stone'), place: 'back' } })
    expect(put.state.items!.at(-1)).toMatchObject({ key: 'stone', place: 'back' })
    const full = run(put.state, { type: 'addItem', item: { ...give('stone'), place: 'back' } })
    expect(full.state.items!.find((i) => i.key === 'stone-2')?.place).toBeUndefined()
    expect(full.events).toContainEqual({
      type: 'ITEM_NO_ROOM',
      character: 'mira',
      item: 'stone',
      place: 'back',
    })
  })
})
