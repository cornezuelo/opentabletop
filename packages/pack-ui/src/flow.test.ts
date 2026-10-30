import { describe, expect, it } from 'vitest'
import { flowText, parseFlow } from './flow'

describe('conditions as one line', () => {
  it('shows a map as flow YAML and reads it back, braces optional', () => {
    expect(flowText({ edges: ['road', 'river'] })).toBe('{ edges: [ road, river ] }')
    expect(parseFlow('{ edges: [ road, river ] }')).toEqual({ edges: ['road', 'river'] })
    expect(parseFlow('tags: landmark, danger: { gte: 3 }')).toEqual({
      tags: 'landmark',
      danger: { gte: 3 },
    })
  })

  it('empty means unset; anything but a map is rejected', () => {
    expect(parseFlow('  ')).toBeUndefined()
    expect(flowText(undefined)).toBe('')
    expect(parseFlow('[road]')).toBeNull()
    expect(parseFlow('tags: [')).toBeNull()
  })
})

describe('flowText on long values', () => {
  it('keeps them on one line', () => {
    const long = {
      any: [
        { moment: 'trip.place-enter', danger: { gte: 1 } },
        { moment: 'actions.rest', danger: { gte: 3 } },
        { moment: 'actions.camp', danger: { gte: 4 } },
      ],
    }
    expect(flowText(long)).not.toContain('\n')
    expect(parseFlow(flowText(long))).toEqual(long)
  })
})

describe('flowText on maps keyed by numbers', () => {
  it('writes them in their order, unquoted, and reads them back', () => {
    const tones = { 0: 'accent', 1: 'good', '-3': 'danger', '-1': 'warning' }
    expect(flowText(tones)).toBe('{ -3: danger, -1: warning, 0: accent, 1: good }')
    expect(parseFlow(flowText(tones))).toEqual(tones)
  })
})
