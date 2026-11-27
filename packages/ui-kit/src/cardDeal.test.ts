import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import CardDeal from './CardDeal.svelte'
import { CARD_RATIO, landAt, layCards, type CardTable } from './cardDeal'

const table: CardTable = { width: 700, height: 380, deck: 124 }

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
