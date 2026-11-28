import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import CardDeal from './CardDeal.svelte'
import { CARD_RATIO, deckSpots, landAt, layCards, type CardTable } from './cardDeal'

const table: CardTable = { width: 700, height: 380, deck: 124 }

describe("a deck's draws on a table in a page", () => {
  it('keeps the last three in a row between the deck and the discards, whole', () => {
    for (const t of [table, { width: 520, height: 200, deck: 100 }]) {
      const { spots, pile } = deckSpots(t)
      expect(spots).toHaveLength(3)
      expect(spots[0]!.x).toBeLessThan(spots[1]!.x)
      expect(spots[1]!.x).toBeLessThan(spots[2]!.x)
      const w = spots[0]!.width
      expect(spots[0]!.x - w / 2).toBeGreaterThan(t.deck)
      expect(spots[2]!.x + w / 2).toBeLessThan(pile.x - pile.width / 2)
      expect(pile.x + pile.width / 2).toBeLessThanOrEqual(t.width)
      expect(w * CARD_RATIO).toBeLessThan(t.height)
      // The cards don't overlap.
      expect(spots[1]!.x - spots[0]!.x).toBeGreaterThan(w)
    }
  })

  it('keeps fewer in sight where there is no room to read three (a side panel)', () => {
    const { spots } = deckSpots({ width: 272, height: 170, deck: 70 })
    expect(spots.length).toBeLessThan(3)
    expect(spots.length).toBeGreaterThanOrEqual(1)
    expect(spots[0]!.width).toBeGreaterThanOrEqual(60)
  })

  it('keeps one card in play, between the deck and the discards, when asked for one', () => {
    const { spots, pile } = deckSpots(table, 1)
    expect(spots).toHaveLength(1)
    const w = spots[0]!.width
    expect(spots[0]!.x - w / 2).toBeGreaterThan(table.deck)
    expect(spots[0]!.x + w / 2).toBeLessThan(pile.x - pile.width / 2)
  })
})

describe('cards laid on the card table', () => {
  it('lays one card in the middle of the table beside the deck, whole', () => {
    const [card] = layCards([{}], table)
    expect(card!.x).toBe(Math.round(124 + (700 - 124) / 2))
    expect(card!.y).toBe(190)
    expect(card!.width).toBeLessThanOrEqual(130)
    expect(card!.width * CARD_RATIO).toBeLessThan(380)
  })

  it('lays a spread at its places, a card across another over it, all on the table', () => {
    // The Celtic cross: a cross and a staff.
    const places: [number, number][] = [
      [1, 1],
      [1, 1],
      [1, 2],
      [0, 1],
      [1, 0],
      [2, 1],
      [3, 3],
      [3, 2],
      [3, 1],
      [3, 0],
    ]
    const laid = layCards(
      places.map((at, i) => ({ place: { at, across: i === 1 } })),
      table,
    )
    expect(laid[1]).toMatchObject({ x: laid[0]!.x, y: laid[0]!.y, across: true })
    expect(laid[3]!.x).toBeLessThan(laid[0]!.x)
    expect(laid[5]!.x).toBeGreaterThan(laid[0]!.x)
    expect(laid[4]!.y).toBeLessThan(laid[0]!.y)
    expect(laid[9]!.y).toBeLessThan(laid[6]!.y)
    for (const card of laid) {
      const h = (card.width * CARD_RATIO) / 2
      expect(card.x - card.width / 2).toBeGreaterThan(table.deck)
      expect(card.x + card.width / 2).toBeLessThanOrEqual(table.width)
      expect(card.y - h).toBeGreaterThanOrEqual(0)
      expect(card.y + h).toBeLessThanOrEqual(table.height)
    }
  })

  it('lays a hand in a row, and the cards without a place under a spread', () => {
    const hand = layCards([{}, {}, {}, {}, {}], table)
    expect(new Set(hand.map((c) => c.y)).size).toBe(1)
    expect(hand.map((c) => c.x)).toEqual([...hand.map((c) => c.x)].sort((a, b) => a - b))
    const mixed = layCards([{ place: { at: [0, 0] } }, { place: { at: [1, 0] } }, {}], table)
    expect(mixed[2]!.y).toBeGreaterThan(mixed[0]!.y)
  })

  it('keeps a card let go anywhere whole on the table, clear of the deck', () => {
    expect(landAt(0, 0, 100, table).x).toBeGreaterThan(table.deck + 50)
    expect(landAt(9999, 9999, 100, table).y).toBeLessThan(table.height - 80)
    expect(landAt(400, 190, 100, table)).toEqual({ x: 400, y: 190 })
  })
})

const fool = { image: 'core/cards/tarot/fool.webp' }

describe('the card table on screen', () => {
  it('waits for the hand with the deck, saying how to draw and how many are left', () => {
    const { body } = render(CardDeal, {
      props: {
        cards: [{ face: fool, caption: 'The Fool' }],
        title: 'Tarot',
        left: 77,
        onuse: () => {},
      },
    })
    expect(body).toContain('Click the deck, or drag its top card onto the table.')
    expect(body).toContain('77 left')
    expect(body).toContain('Tarot')
    // The card is in the deck still: its text waits for it to be turned.
    expect(body).not.toContain('>The Fool<')
  })

  it('deals a spread with a click, in Spanish', () => {
    const { body } = render(CardDeal, {
      props: {
        cards: [{ face: fool }, { face: fool }, { face: fool }],
        locale: 'es',
        onuse: () => {},
      },
    })
    expect(body).toContain('Pulsa el mazo para repartir.')
  })

  it('shows the gathering first when the deck was shuffled for it', () => {
    const { body } = render(CardDeal, {
      props: { cards: [{ face: fool }], shuffled: true, pile: fool, onuse: () => {} },
    })
    expect(body).toContain('Shuffling…')
  })
})
