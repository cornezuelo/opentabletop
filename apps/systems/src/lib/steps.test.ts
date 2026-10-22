import { describe, expect, it } from 'vitest'
import { conditionWords } from '@open-tabletop/pack-ui'
import { kindValue, minutesText, stepKind, stepSummary, withKind, type StepContext } from './steps'

const names = {
  action: (id: string) => ({ march: 'March', forage: 'Forage' })[id] ?? id,
  check: (e: string) => (e === 'ENCOUNTER' ? 'Encounters' : e),
  mode: (id: string) => (id === 'boat' ? 'By boat' : id),
  param: (id: string) => (id === 'how' ? 'How do you cross?' : id),
  part: (ref: string) => (ref === 'time.part.morning' ? 'Part of the day: Morning' : ref),
  condition: (c: unknown) => conditionWords(c, 'en'),
}

describe('steps as cards', () => {
  it('reads every kind of step in words', () => {
    const said = (step: object) => stepSummary(step as never, names)
    expect(said({ time: 180 })).toBe('Pass 3 h')
    expect(said({ time: 90 })).toBe('Pass 1 h 30 min')
    expect(said({ time: '14:00' })).toBe('Pass time until 14:00')
    expect(said({ time: 'time.part.morning' })).toBe(
      'Pass time until Part of the day: Morning begins',
    )
    expect(said({ 'travel.move': 'destination' })).toBe('Move to the destination')
    expect(said({ 'travel.move': 3 })).toBe('Move 3 hexes')
    expect(said({ 'travel.move': '{{params.until}}' })).toBe('Move: {{params.until}}')
    expect(said({ 'travel.speed': 0.5 })).toBe('Speed ×0.5 the rest of the day')
    expect(said({ 'travel.mode': 'modes.boat' })).toBe('Travel: By boat')
    expect(said({ effects: { 'party.stats.fatigue': 1 } })).toBe('Change: party.stats.fatigue: 1')
    expect(said({ do: 'actions.march', with: { until: 'hex' } })).toBe('Take March (until: hex)')
    expect(said({ roll: 'checks.ENCOUNTER' })).toBe('Roll Encounters')
    expect(said({ pause: true })).toBe('Pause until Continue')
    expect(said({ pause: 'The bridge is down.' })).toBe('Pause: “The bridge is down.”')
    expect(said({ ask: 'params.how' })).toBe('Ask: How do you cross?')
    expect(said({ wait: { 'today.ferry': true }, limit: '18:00' })).toBe(
      'Wait until today.ferry is true (at most 18:00)',
    )
    expect(said({ time: 60, say: 'two things' })).toMatch(/^Unknown step/)
  })

  it('changing what a step does keeps its condition and id, and drops what went with the old kind', () => {
    const step = { id: 'x', when: { lost: true }, do: 'actions.march', with: { until: 'hex' } }
    expect(withKind(step as never, 'wait', {})).toEqual({
      id: 'x',
      when: { lost: true },
      wait: {},
      limit: 60,
    })
    expect(stepKind(withKind(step as never, 'time', 60))).toBe('time')
  })

  it('a new kind gets a value naming what the system has', () => {
    const ctx = {
      actions: [{ id: 'forage', name: 'Forage', params: [] }],
      params: [{ id: 'how', name: 'How' }],
      modes: [{ id: 'boat', name: 'By boat' }],
      checks: [{ event: 'ENCOUNTER', name: 'Encounters' }],
      values: ['lost'],
      effectKeys: ['party.stats.fatigue'],
      times: [],
      conditions: {},
      names,
    } satisfies StepContext
    expect(kindValue('do', ctx)).toBe('actions.forage')
    expect(kindValue('roll', ctx)).toBe('checks.ENCOUNTER')
    expect(kindValue('ask', ctx)).toBe('params.how')
    expect(kindValue('travel.mode', ctx)).toBe('modes.boat')
    expect(kindValue('set', ctx)).toEqual({ lost: true })
    expect(kindValue('effects', ctx)).toEqual({ 'party.stats.fatigue': 1 })
    expect(minutesText(45)).toBe('45 min')
  })
})

describe("the bundled systems' actions as cards", () => {
  it('every step is one kind, and every condition that has rows writes back the same', async () => {
    const { travelSystems } = await import('@open-tabletop/session')
    const { actionSteps } = await import('@open-tabletop/travel-engine')
    const { conditionRows, rowsCondition } = await import('@open-tabletop/pack-ui')
    const { library } = await import('./packs.svelte')
    let read = 0
    let yaml = 0
    for (const { rules } of travelSystems(library.registry).systems)
      for (const action of Object.values(rules.actions ?? {})) {
        const conditions: unknown[] = [action.when, action.unless]
        for (const step of actionSteps(action)) {
          expect(stepKind(step), JSON.stringify(step)).toBeDefined()
          conditions.push(step.when, step.unless, step.wait)
        }
        for (const c of conditions.filter(Boolean)) {
          const rows = conditionRows(c)
          if (!rows) {
            yaml++
            continue
          }
          read++
          expect(rowsCondition(rows), JSON.stringify(c)).toEqual(c)
        }
      }
    expect(read).toBeGreaterThan(20)
    // Rows say nearly all of them; the rest stay YAML.
    expect(yaml).toBeLessThan(read / 4)
  })
})
