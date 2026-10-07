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
  })

  it('complete keys and values inside one-line conditions and values', () => {
    expect(completeYaml('  - { range: 1, when: { ter', hints)).toEqual({
      from: 24,
      options: ['terrain'],
    })
    expect(completeYaml('when: { season: w', hints)?.options).toEqual(['winter'])
    expect(completeYaml('    set: { resources: { f', hints)?.options).toEqual(['food'])
  })

  it('complete keys at the start of a line', () => {
    expect(completeYaml('  - maxO', hints)).toEqual({ from: 4, options: ['maxOccurrences'] })
    expect(completeYaml('# a comment', hints)).toBeNull()
  })
})
