import { describe, expect, it } from 'vitest'
import { addTags, tagChoices } from './tags'

describe('addTags', () => {
  it('splits on commas, trims and keeps each word once', () => {
    expect(addTags(['a'], ' b, a ,, c ')).toEqual(['a', 'b', 'c'])
    expect(addTags(['a'], '   ')).toEqual(['a'])
  })

  it('splits on spaces when words hold commas', () => {
    expect(addTags(['3,6'], ' 4,6  3,6 15,9', 'space')).toEqual(['3,6', '4,6', '15,9'])
  })
})

describe('tagChoices', () => {
  const choices = [
    'time.part.morning',
    'trip.hex-enter',
    'time.watch.middle',
    'actions.camp',
    '06:00',
  ]

  it('groups by the first part, leaving out what is taken', () => {
    expect(tagChoices(choices, '', ['actions.camp'])).toEqual([
      { group: 'time', items: ['time.part.morning', 'time.watch.middle'] },
      { group: 'trip', items: ['trip.hex-enter'] },
      { group: '', items: ['06:00'] },
    ])
  })

  it('puts what starts with the typed text first, then what contains it', () => {
    expect(tagChoices(choices, 'camp', []).flatMap((g) => g.items)).toEqual(['actions.camp'])
    expect(tagChoices(['xmorning', 'morning'], 'morn', []).flatMap((g) => g.items)).toEqual([
      'morning',
      'xmorning',
    ])
  })
})
