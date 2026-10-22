import { describe, expect, it } from 'vitest'
import { boundsOf, createCharacter, displayOf } from '@open-tabletop/character-engine'
import { valueView } from '@open-tabletop/character-ui'
import { systems } from './packs.svelte'

// The bundled sheets show every way a value can be drawn, read from the packs themselves.
const marches = () => systems.list.find((s) => s.id === 'grey-marches')!
const core = () => systems.list.find((s) => s.id === 'core')!

describe('how the bundled sheets show their values', () => {
  it('the Grey Marches use every display', () => {
    const s = marches()
    const shown = [
      ...Object.values(s.sheet.def.values),
      ...Object.values(s.partySheet!.def.values),
      ...Object.values(s.factions!.sheet.def.values),
    ].map(displayOf)
    expect(new Set(shown)).toEqual(
      new Set(['number', 'of', 'bar', 'boxes', 'pips', 'dial', 'levels']),
    )
    expect(s.sheet.def.relations.bond.value?.display).toBe('pips')
  })

  it('a companion’s health is a bar up to its max, its tone falling with it', () => {
    const sheet = marches().sheet.def
    const kael = createCharacter(sheet, marches().sheet.id, { id: 'kael' })
    const at = (health: number) =>
      valueView(sheet.values.health, health, boundsOf(sheet, kael, 'health'), 'en')
    expect(at(3)).toMatchObject({ display: 'bar', max: 3, fill: 1, tone: 'good' })
    expect(at(1)).toMatchObject({ tone: 'warning' })
    expect(at(0)).toMatchObject({ fill: 0, tone: 'danger' })
    // Dread turns red only when full.
    const dread = (v: number) =>
      valueView(sheet.values.dread, v, boundsOf(sheet, kael, 'dread'), 'en').tone
    expect([0, 4, 6].map(dread)).toEqual([undefined, 'warning', 'danger'])
  })

  it('a faction’s reputation is a named level, the first at its min, in every language', () => {
    const sheet = marches().factions!.sheet.def
    const view = (v: number, locale: string) =>
      valueView(sheet.values.reputation, v, { min: -3, max: 3 }, locale)
    expect(view(-3, 'en')).toMatchObject({ level: 0, tone: 'danger' })
    expect(view(-3, 'en').levels?.[0]).toEqual({
      id: 'hostile',
      name: 'Hostile',
      description: 'Attacks the party on sight.',
    })
    expect(view(0, 'en').levels?.[view(0, 'en').level!].name).toBe('Neutral')
    expect(view(3, 'es').levels?.[view(3, 'es').level!].name).toBe('Amigos jurados')
    expect(view(-2, 'es').levels?.[1].name).toBe('Poco amistosa')
  })

  it('Core keeps to the smallest: a bar and boxes', () => {
    expect(displayOf(core().sheet.def.values.health)).toBe('bar')
    expect(displayOf(core().partySheet!.def.values.morale)).toBe('boxes')
  })
})
