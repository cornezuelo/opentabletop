import { createOracleEngine, emptyState, loadPacks, packImage } from '@open-tabletop/oracle-engine'
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

  it('every card has a face, and every picture one is drawn with exists', () => {
    for (const id of [
      'core/playing-cards',
      'core/spanish-deck',
      'core/tarot',
      'core/lenormand',
      'core/runes',
      'core/dominoes',
    ]) {
      const deck = registry.definitions.get(id)
      if (deck?.kind !== 'deck') throw new Error(id)
      for (const card of deck.cards) {
        expect(card.face, `${id}#${card.key}`).toBeDefined()
        if (card.face?.image) expect(packImage(registry, card.face.image), card.key).toBeDefined()
      }
    }
  })

  it('draws a tarot card upside down when it comes out reversed, as it says', () => {
    let seen = 0
    for (let i = 0; i < 12; i++) {
      const { resolution } = createOracleEngine({ registry, random: seeded(`t${i}`) }).draw(
        'core/tarot',
        emptyState(),
      )
      expect(resolution.face?.image).toMatch(/^core\/cards\/tarot\/.+\.webp$/)
      expect(!!resolution.face?.turned).toBe(/reversed/.test(resolution.text ?? ''))
      if (resolution.face?.turned) seen++
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('lays the Celtic cross as a cross and a staff, the second card across the first', () => {
    const { resolution } = engine().resolve('core/celtic-cross', {})
    expect(resolution.children.map((c) => c.place)).toEqual([
      { at: [1, 1] },
      { at: [1, 1], across: true },
      { at: [1, 2] },
      { at: [0, 1] },
      { at: [1, 0] },
      { at: [2, 1] },
      { at: [3, 3] },
      { at: [3, 2] },
      { at: [3, 1] },
      { at: [3, 0] },
    ])
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

  it('come out upright or reversed in the tarot, each its own meaning, in the language played', () => {
    const drawn = Array.from({ length: 40 }, (_, i) => {
      const oracle = createOracleEngine({ registry, random: seeded(i), locale: 'es' })
      return oracle.draw('core/tarot').resolution
    })
    for (const d of drawn) expect(d.text!.includes(', del revés: ')).toBe(d.value.reversed)
    expect(new Set(drawn.map((d) => d.value.reversed))).toEqual(new Set([true, false]))
    // Every card has its reversed meaning, in both languages.
    for (const locale of ['en', 'es']) {
      const oracle = createOracleEngine({ registry, random: seeded(1), locale })
      const reversed = new Set<string>()
      let state = emptyState()
      for (let i = 0; i < 78 * 12; i++) {
        const { resolution, state: next } = oracle.draw('core/tarot', state)
        state = next
        if (resolution.value.reversed) reversed.add(resolution.value.card as string)
        if (resolution.value.reversed)
          expect(resolution.text).toMatch(locale === 'en' ? /, reversed: / : /, del revés: /)
      }
      expect(reversed.size).toBe(78)
    }
  })

  it('the hedge-witch’s cards have a back of their own, a picture of the pack', () => {
    const deck = registry.definitions.get('grey-marches/hedge-cards')
    if (deck?.kind !== 'deck') throw new Error('hedge-cards')
    expect(deck.back).toBe('grey-marches/art/cards/hedge-back.svg')
    expect(packImage(registry, deck.back!)).toMatch(/^data:image\/svg\+xml/)
  })

  it('the hedge-witch’s Lantern means its way up: home, or astray', () => {
    const lantern = new Map<boolean, string>()
    for (let i = 0; i < 200 && lantern.size < 2; i++) {
      const { resolution } = createOracleEngine({ registry, random: seeded(`l${i}`) }).draw(
        'grey-marches/hedge-cards',
        emptyState(),
      )
      if (resolution.value.card !== 'lantern') continue
      lantern.set(resolution.value.reversed as boolean, resolution.text!)
      const morale = (resolution.value.effects as Record<string, number>)['party.stats.morale']
      expect(morale).toBe(resolution.value.reversed ? -1 : 1)
      expect(!!resolution.face?.turned).toBe(resolution.value.reversed)
    }
    expect(lantern.get(true)).toBe('The Lantern, a light that leads astray')
    expect(lantern.get(false)).toBe('The Lantern, a safe way home')
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
