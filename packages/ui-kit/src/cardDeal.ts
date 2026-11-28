/**
 * Where the cards of a draw lie on the card table (docs/cards.md): one card in the middle of
 * what's left of the table beside the deck, a spread's at their `[column, row]` (a card
 * `across` another over it, turned a quarter), cards without a place in a row after them.
 * Sizes in px; each card's centre.
 */
export interface CardTable {
  width: number
  height: number
  /** The room kept at the left for the deck. */
  deck: number
}

export interface LaidCard {
  x: number
  y: number
  width: number
  across: boolean
}

/** A card's height for its width, as `PlayingCard` draws it. */
export const CARD_RATIO = 1.6

/** The largest a card is drawn on the table. */
const MAX_WIDTH = 130
/** The narrowest a card in sight is drawn, to be read. */
const MIN_READABLE = 60
const GAP = 12

export function layCards(
  cards: readonly { place?: { at?: [number, number]; across?: boolean } }[],
  table: CardTable,
): LaidCard[] {
  if (!cards.length) return []
  const placed = cards.some((c) => c.place?.at)
  const columns = Math.max(
    0,
    ...cards.map((c) => (c.place?.at ? c.place.at[0] + 1 : 0)),
    placed ? 0 : cards.length,
  )
  const rows = Math.max(0, ...cards.map((c) => (c.place?.at ? c.place.at[1] + 1 : 0)))
  const loose = cards.filter((c) => !c.place?.at).length
  // With a spread, the cards without a place lie in a row under it.
  const looseRow = placed && loose > 0
  const allColumns = Math.max(columns, looseRow ? loose : 0)
  const allRows = placed ? rows + (looseRow ? 1 : 0) : 1
  // A spread leaves room around each card for one lying across it.
  const across = cards.some((c) => c.place?.across)
  const cellWidth = across ? 1.75 : 1.15
  const left = table.deck
  const width = Math.max(table.width - left - GAP * 2, 40)
  const height = Math.max(table.height - GAP * 2, 40)
  const card = Math.floor(
    Math.min(MAX_WIDTH, width / (allColumns * cellWidth), height / (allRows * (CARD_RATIO + 0.12))),
  )
  const cellW = card * cellWidth
  const cellH = card * (CARD_RATIO + 0.12)
  const x0 = left + GAP + (width - allColumns * cellW) / 2
  const y0 = GAP + (height - allRows * cellH) / 2
  let next = 0
  return cards.map((c) => {
    const at = c.place?.at
    const [column, row] = at ?? [next++, placed ? rows : 0]
    // A row shorter than the spread is centred under it.
    const shift = at || !looseRow ? 0 : ((allColumns - loose) * cellW) / 2
    return {
      x: Math.round(x0 + shift + (column + 0.5) * cellW),
      y: Math.round(y0 + (row + 0.5) * cellH),
      width: card,
      across: !!c.place?.across,
    }
  })
}

/** Where a card lies when it's let go at `(x, y)`: kept whole on the table, clear of the deck. */
export function landAt(
  x: number,
  y: number,
  width: number,
  table: CardTable,
): { x: number; y: number } {
  const half = width / 2
  const halfH = (width * CARD_RATIO) / 2
  return {
    x: Math.round(Math.min(table.width - half - GAP, Math.max(table.deck + half + GAP, x))),
    y: Math.round(Math.min(table.height - halfH - GAP, Math.max(halfH + GAP, y))),
  }
}

/**
 * Where a deck's draws lie on a table in a page (the Oracle's, docs/cards.md): the last
 * cards drawn (`most`, or fewer when narrow) in a row between the deck (at the left, `table.deck` wide) and the discard
 * pile (at the right), the newest at the right; the pile's centre and its cards' width.
 */
export function deckSpots(
  table: CardTable,
  most = 3,
): { spots: LaidCard[]; pile: { x: number; y: number; width: number } } {
  const pileWidth = Math.round(Math.min(64, table.deck * 0.6))
  const pileX = table.width - GAP - pileWidth / 2 - 8
  const left = table.deck + GAP
  const right = pileX - pileWidth / 2 - GAP * 2
  const room = Math.max(right - left, 60)
  const widthFor = (n: number) =>
    Math.floor(Math.min(MAX_WIDTH, room / (n * 1.15), (table.height - GAP * 3) / CARD_RATIO))
  // As many in sight as there's room for, each wide enough to read (one at the least).
  let kept = most
  while (kept > 1 && widthFor(kept) < MIN_READABLE) kept--
  const width = widthFor(kept)
  const step = room / kept
  const y = Math.round(table.height / 2)
  return {
    spots: Array.from({ length: kept }, (_, i) => ({
      x: Math.round(left + step * (i + 0.5)),
      y,
      width,
      across: false,
    })),
    pile: { x: Math.round(pileX), y, width: pileWidth },
  }
}

/** What the card table says (the dialog's and the page's), in the UI's language. */
const CARD_TEXT = {
  en: {
    hint: 'Click the deck, or drag its top card onto the table.',
    spread: 'Click the deck to deal.',
    turn: 'Click a card to turn it over.',
    deck: 'The deck: click it to draw',
    left: '{left} left',
    drawn: 'Drawn',
    discard: 'Discards',
    see: 'See it',
    close: 'Put away',
    turnAll: 'Turn all',
    skip: 'Skip',
    shuffling: 'Shuffling…',
    dealing: 'Dealing…',
  },
  es: {
    hint: 'Pulsa el mazo, o arrastra su carta de arriba a la mesa.',
    spread: 'Pulsa el mazo para repartir.',
    turn: 'Pulsa una carta para darle la vuelta.',
    deck: 'El mazo: púlsalo para robar',
    left: 'Quedan {left}',
    drawn: 'Robadas',
    discard: 'Descartes',
    see: 'Verla',
    close: 'Guardar',
    turnAll: 'Voltear todas',
    skip: 'Saltar',
    shuffling: 'Barajando…',
    dealing: 'Repartiendo…',
  },
}
export const cardTexts = (locale: string) =>
  CARD_TEXT[locale as keyof typeof CARD_TEXT] ?? CARD_TEXT.en
