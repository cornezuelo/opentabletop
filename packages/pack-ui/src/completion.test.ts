import { describe, expect, it } from 'vitest'
import { completeYaml } from './completion'

const hints = {
  refs: ['weather', 'weather-spring', 'core/action'],
  context: { terrain: ['forest', 'hills'], season: ['spring', 'winter'] },
  set: { 'resources.food': [], weather: ['storm'] },
}

describe('YAML suggestions', () => {
  it('complete fixed values, references and context values after a key', () => {
    expect(completeYaml('kind: ta', hints)).toEqual({ from: 6, options: ['table'] })
    expect(completeYaml('  - { range: 1, table: wea', hints)).toEqual({
      from: 23,
      options: ['weather', 'weather-spring'],
    })
    expect(completeYaml('  resolve: ', hints)?.options).toContain('core/action')
    expect(completeYaml('onExhausted: n', hints)?.options).toEqual(['next', 'none'])
    // A check can be resolved by anything that rolls (oracles and decks too).
    const withRollable = { ...hints, rollable: [...hints.refs, 'ford', 'core/omens-deck'] }
    expect(completeYaml('  resolve: fo', withRollable)?.options).toEqual(['ford'])
    expect(completeYaml('  table: fo', withRollable)).toBeNull()
  })

  it('complete keys and values inside one-line conditions and values', () => {
    expect(completeYaml('  - { range: 1, when: { ter', hints)).toEqual({
      from: 24,
      options: ['terrain'],
    })
    expect(completeYaml('when: { season: w', hints)?.options).toEqual(['winter'])
    expect(completeYaml('    set: { resources: { f', hints)?.options).toEqual(['food'])
  })

  it('complete travel rules: moments, the system’s actions and checks, effect paths', () => {
    const travel = {
      ...hints,
      actions: ['actions.camp', 'actions.rest', 'actions.forage', 'actions.eat'],
      events: ['checks.ENCOUNTER', 'checks.FORAGE'],
      effects: { 'party.stats.fatigue': [], 'party.resources.food': [] },
    }
    expect(completeYaml('    on: day', travel)?.options).toEqual(['time.day-end'])
    expect(completeYaml('    at: fo', travel)?.options).toEqual(['actions.forage'])
    expect(completeYaml('      - { do: fo', travel)?.options).toEqual(['actions.forage'])
    expect(completeYaml('      - { roll: EN', travel)?.options).toEqual(['checks.ENCOUNTER'])
    // The halt takes an action, like a step's `do`.
    expect(completeYaml("    halt: { at: '20:00', do: fo", travel)?.options).toEqual([
      'actions.forage',
    ])
    expect(completeYaml('      - { time: 06', travel)?.options).toEqual(['06:00'])
    expect(
      completeYaml('      - { when: { mode: horse }, effects: { party.r', travel)?.options,
    ).toEqual(['party.resources.food'])
    expect(completeYaml('  oncePer', travel)?.options).toEqual(['oncePerDay'])
  })

  it('complete keys at the start of a line', () => {
    expect(completeYaml('  - maxO', hints)).toEqual({ from: 4, options: ['maxOccurrences'] })
    expect(completeYaml('# a comment', hints)).toBeNull()
  })
})
