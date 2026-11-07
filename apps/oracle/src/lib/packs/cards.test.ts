import { createOracleEngine, emptyState, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { engineFiles } from '@open-tabletop/pack-ui'

describe('the cards of the bundled packs', () => {
  const { registry } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))
  const engine = (locale = 'en') =>
    createOracleEngine({ registry, random: seeded('cards'), locale })
  const size = (id: string) => {
    const deck = registry.definitions.get(id)
    return deck?.kind === 'deck' ? deck.cards.reduce((n, c) => n + c.count, 0) : 0
  }

  it('are the decks they say they are', () => {
    expect(size('core/playing-cards')).toBe(54)
    expect(size('core/spanish-deck')).toBe(40)
    expect(size('core/tarot')).toBe(78)
    expect(size('core/lenormand')).toBe(36)
    expect(size('core/runes')).toBe(24)
    expect(size('core/dominoes')).toBe(28)
  })

  it('draw a whole deck with every card told, in English and in Spanish', () => {
    for (const locale of ['en', 'es'])
      for (const id of [
        'core/playing-cards',
        'core/spanish-deck',
        'core/tarot',
        'core/lenormand',
        'core/runes',
        'core/dominoes',
      ]) {
        const oracle = engine(locale)
        let state = emptyState()
        const seen = new Set<string>()
        for (let i = 0; i < size(id); i++) {
          const { resolution, state: next } = oracle.draw(id, state)
          state = next
          expect(resolution.text).toBeTruthy()
          expect(resolution.text).not.toContain('{{')
          seen.add(resolution.text!)
        }
        expect(seen.size).toBe(size(id))
      }
  })

  it('come out upright or reversed in the tarot, in the language played', () => {
    const texts = Array.from({ length: 40 }, (_, i) => {
      const oracle = createOracleEngine({ registry, random: seeded(i), locale: 'es' })
      return oracle.draw('core/tarot').resolution.text!
    })
    expect(texts.some((t) => t.includes(', al derecho: '))).toBe(true)
    expect(texts.some((t) => t.includes(', del revés: '))).toBe(true)
  })

  it('never repeat in a hand or a spread, dealt again and again', () => {
    const dealt = {
      'core/poker-hand': 5,
      'core/three-card-reading': 3,
      'core/celtic-cross': 10,
      'core/tarot-character': 3,
      'core/lenormand-line': 3,
      'core/rune-cast': 3,
      'grey-marches/hedge-reading': 3,
    }
    const oracle = engine()
    for (const [id, cards] of Object.entries(dealt)) {
      let state = emptyState()
      for (let i = 0; i < 30; i++) {
        const { resolution, state: next } = oracle.resolve(id, {}, state)
        state = next
        const entries = resolution.children.map((c) => c.entry)
        expect(new Set(entries).size).toBe(cards)
        expect(resolution.text).not.toContain('{{')
      }
    }
  })

  it('say what a suit speaks of, jokers too', () => {
    const texts = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const oracle = createOracleEngine({ registry, random: seeded(i) })
      const { resolution } = oracle.resolve('core/card-for-the-scene', {})
      const [card, meaning] = resolution.children
      expect(meaning.entry).toBe(card.value.suit)
      texts.add(meaning.entry!)
    }
    expect([...texts].sort()).toEqual(['clubs', 'diamonds', 'hearts', 'joker', 'spades'])
  })

  it("add up the effects of a hedge-witch's cards, for whatever rolled the reading", () => {
    const effects = Array.from({ length: 60 }, (_, i) => {
      const oracle = createOracleEngine({ registry, random: seeded(i) })
      const { value } = oracle.resolve('grey-marches/hedge-reading', {}).resolution
      return value.effects as Record<string, number> | undefined
    })
    expect(effects.some((e) => e?.['world.clocks.the-greywood-wyrm-wakes'] === 1)).toBe(true)
    expect(effects.some((e) => e?.['party.stats.morale'] !== undefined)).toBe(true)
  })
})
