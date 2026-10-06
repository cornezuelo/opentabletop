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
