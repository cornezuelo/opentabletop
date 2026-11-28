<script lang="ts">
  import { untrack } from 'svelte'
  import CardBack from './CardBack.svelte'
  import { cardTexts, deckSpots, layCards, type CardTable } from './cardDeal'
  import DeckStack from './DeckStack.svelte'
  import { dicePreferences } from './dicePreferences.svelte'
  import { swish } from './diceSound'
  import type PlayingCard from './PlayingCard.svelte'
  import StyledText from './StyledText.svelte'
  import TableCard from './TableCard.svelte'

  type Face = import('svelte').ComponentProps<typeof PlayingCard>['face']
  type Card = {
    face: Face
    caption?: string
    place?: { at?: [number, number]; across?: boolean }
  }

  /**
   * The card table living in a page, kept between draws (the Oracle's, docs/cards.md): the
   * deck face down at the left with the cards it has left; a click on it, or its top card
   * dragged onto the cloth, asks the host to draw (`onagain`), and each draw the host makes
   * (`round`, with its `cards`) is dealt and turned over there. A deck's draws stay on the
   * table, the last three in sight and the older ones on a discard pile at the right, until
   * it's gathered: by the draw that shuffles it (`shuffled`) or by a shuffle by hand
   * (`shuffleRound`), the cards out going back face down and the deck riffled. A spread
   * (`spread`: a generator's hand or cross) is dealt face down to its places, each card turned
   * by a click on it or all with **Turn all**; the next one gathers it first. Each draw is
   * taken (`onuse`) once it's all face up. Without motion everything lies still at once.
   */
  let {
    cards,
    spread = false,
    round,
    shuffled = false,
    shuffleRound,
    left,
    back,
    locale = 'en',
    onagain,
    onuse,
  }: {
    /** The last draw's cards, in the order they're dealt. */
    cards: readonly Card[]
    /** A generator's spread (dealt face down to its places), not a deck's single draws. */
    spread?: boolean
    /** The draw's number: a new one deals `cards`. */
    round?: number
    /** The deck was gathered and shuffled for this draw: seen first. */
    shuffled?: boolean
    /** A shuffle by hand's number: a new one gathers the cards out and riffles the deck. */
    shuffleRound?: number
    /** The cards left in the deck. */
    left?: number
    /** The deck's back, a pack's picture. */
    back?: string
    locale?: string
    /** The hand asked for a draw: the host draws (and answers with a new `round`). */
    onagain: () => void
    /** A draw is all face up: what it says can be shown. */
    onuse: () => void
  } = $props()

  const text = $derived(cardTexts(locale))
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const moves = dicePreferences.animate && !reduced
  const hear = (strength: number, seconds?: number) => {
    if (dicePreferences.sound) swish(strength, seconds)
  }

  let table = $state<CardTable>({ width: 600, height: 280, deck: 120 })
  let tableEl: HTMLDivElement | undefined = $state()
  $effect(() => {
    if (!tableEl) return
    const fit = () => {
      const rect = tableEl!.getBoundingClientRect()
      if (rect.width <= 0) return
      const deckWidth = Math.round(Math.min(84, rect.width * 0.14))
      table = { width: rect.width, height: rect.height, deck: deckWidth + 32 }
    }
    fit()
    const watcher = new ResizeObserver(fit)
    watcher.observe(tableEl)
    return () => watcher.disconnect()
  })
  const deckWidth = $derived(table.deck - 32)
  const deckAt = $derived({ x: 16, y: table.height / 2 })
  const deckCentre = $derived({ x: 16 + deckWidth / 2, y: table.height / 2 })
  const places = $derived(deckSpots(table))

  /** What lies on the table: the deck's last draws (or the spread), and the pile's top card. */
  let kept: Card[] = []
  let pileTop = $state<Card>()
  /** A card as it's drawn now: where it lies, where it flies from, whether it's up. */
  type Lying = {
    key: number
    card: Card
    x: number
    y: number
    width: number
    across: boolean
    up: boolean
    /** Where it's drawn away from its place (flying in from the deck, gone to the pile). */
    offset?: { dx: number; dy: number; scale: number }
    turnable: boolean
  }
  let lying = $state<Lying[]>([])
  let keys = 0
  let riffling = $state(false)
  let stage = $state<'idle' | 'busy' | 'turning'>('idle')
  /** The latest card turned up in a spread, whose text shows under the table. */
  let latest = $state<string>()
  /** The draw being played was taken (`onuse`) already. */
  let used = true

  const timers: ReturnType<typeof setTimeout>[] = []
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
  function stop() {
    timers.forEach(clearTimeout)
    timers.length = 0
  }
  $effect(() => () => stop())

  /** Where each kept card lies, still. */
  function still(): Lying[] {
    if (spread) {
      const laid = layCards(kept, table)
      return kept.map((card, i) => ({
        key: ++keys,
        card,
        x: laid[i]!.x,
        y: laid[i]!.y,
        width: laid[i]!.width,
        across: laid[i]!.across,
        up: true,
        turnable: false,
      }))
    }
    // Narrower than when they were drawn: the newest that fit.
    return kept.slice(-places.spots.length).map((card, i) => {
      const spot = places.spots[i]!
      return { key: ++keys, card, ...spot, up: true, turnable: false }
    })
  }

  /** The draw seen whole: what it says shows. */
  function take() {
    if (used) return
    used = true
    stage = 'idle'
    onuse()
  }

  /** Everything at once, where it ends: a key, a click, or no motion. */
  export function skip() {
    if (stage === 'idle') return
    stop()
    riffling = false
    lying = still()
    latest = undefined
    take()
  }
  /** Whether a draw is being dealt or waits to be turned. */
  export const busy = () => stage !== 'idle'

  /** The cards out go back face down onto the deck, then it's riffled: when that's over. */
  function gather(at: number, riffle: boolean): number {
    later(at, () => {
      // The pile's top card joins them, from where it lies.
      const out: Lying[] = [
        ...lying,
        ...(pileTop
          ? [
              {
                key: ++keys,
                card: pileTop,
                ...places.pile,
                across: false,
                up: true,
                turnable: false,
              },
            ]
          : []),
      ]
      pileTop = undefined
      lying = out
      hear(0.4, 0.1)
      requestAnimationFrame(() => {
        lying = lying.map((l) => ({
          ...l,
          up: false,
          offset: {
            dx: deckCentre.x - l.x,
            dy: deckCentre.y - l.y,
            scale: deckWidth / l.width,
          },
        }))
      })
    })
    later(at + 560, () => (lying = []))
    if (!riffle) return at + 560
    later(at + 560, () => {
      riffling = true
      for (let k = 0; k < 6; k++) later(560 + k * 60, () => hear(0.25, 0.05))
      later(1250, () => hear(0.6, 0.12))
    })
    later(at + 2060, () => (riffling = false))
    return at + 2080
  }

  /** A card flies in from the deck (or from where the hand let it go) to its place. */
  function dealOne(
    card: Card,
    spot: { x: number; y: number; width: number; across: boolean },
    up: boolean,
  ) {
    const from = letGo ?? deckCentre
    const scale = letGo ? 1 : deckWidth / spot.width
    letGo = undefined
    const l: Lying = {
      key: ++keys,
      card,
      ...spot,
      up: false,
      offset: { dx: from.x - spot.x, dy: from.y - spot.y, scale },
      turnable: false,
    }
    lying = [...lying, l]
    hear(0.5)
    // Next frame it flies; a moment later it turns over on the way.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        lying = lying.map((x) => (x.key === l.key ? { ...x, offset: undefined } : x))
      }),
    )
    if (up)
      later(260, () => {
        lying = lying.map((x) => (x.key === l.key ? { ...x, up: true } : x))
        hear(0.35, 0.1)
      })
  }

  /** A deck's draw: the oldest in sight goes to the pile, the rest move along, the new one comes. */
  function playDraw(fresh: Card[]) {
    const card = fresh[0]
    if (!card) return
    if (shuffled) kept = []
    kept = [...kept, card]
    let goneToPile: Card | undefined
    if (kept.length > places.spots.length) goneToPile = kept.shift()
    if (!moves) {
      if (goneToPile) pileTop = goneToPile
      if (shuffled) pileTop = undefined
      lying = still()
      return take()
    }
    let at = shuffled && (lying.length || pileTop) ? gather(0, true) : 0
    later(at, () => {
      if (lying.length >= places.spots.length) {
        const oldest = lying[0]!
        lying = lying.map((l, i) =>
          i === 0
            ? {
                ...l,
                offset: {
                  dx: places.pile.x - l.x,
                  dy: places.pile.y - l.y,
                  scale: places.pile.width / l.width,
                },
              }
            : { ...l, ...places.spots[i - 1]! },
        )
        later(450, () => {
          lying = lying.filter((l) => l.key !== oldest.key)
          pileTop = oldest.card
        })
      }
      dealOne(card, places.spots[Math.min(places.spots.length - 1, kept.length - 1)]!, true)
    })
    at += 760
    later(at, take)
  }

  /** A spread: gathered first if one lies there, then dealt face down to its places. */
  function playSpread(fresh: Card[]) {
    kept = fresh
    if (!moves) {
      lying = still()
      return take()
    }
    let at = lying.length || pileTop ? gather(0, shuffled) : 0
    const laid = layCards(fresh, table)
    fresh.forEach((card, i) => later(at + i * 170, () => dealOne(card, laid[i]!, false)))
    at += fresh.length * 170 + 500
    later(at, () => {
      lying = lying.map((l) => ({ ...l, turnable: true }))
      stage = 'turning'
    })
  }

  function turn(key: number) {
    const l = lying.find((x) => x.key === key)
    if (!l || l.up) return
    lying = lying.map((x) => (x.key === key ? { ...x, up: true, turnable: false } : x))
    latest = l.card.caption
    hear(0.35, 0.1)
    if (lying.every((x) => x.up)) later(450, take)
  }
  function turnAll() {
    lying.forEach((l, i) => later(i * 140, () => turn(l.key)))
  }

  // Each new draw is played; a draw already made (the page opened again) lies still.
  let lastRound = untrack(() => round)
  let opened = false
  $effect(() => {
    const r = round
    if (!tableEl) return
    untrack(() => {
      if (!opened) {
        opened = true
        if (r === undefined || r === lastRound) {
          kept = spread ? [...cards] : cards.slice(0, 1)
          lying = still()
          if (r === undefined) return
        }
      }
      if (r === undefined || r === lastRound) return
      lastRound = r
      stop()
      used = false
      stage = 'busy'
      latest = undefined
      if (spread) playSpread([...cards])
      else playDraw([...cards])
    })
  })
  // A shuffle by hand: what's out goes back and the deck is riffled.
  let lastShuffle = untrack(() => shuffleRound)
  $effect(() => {
    const r = shuffleRound
    if (r === undefined || r === lastShuffle) return
    lastShuffle = r
    untrack(() => {
      stop()
      kept = []
      if (!moves) {
        lying = []
        pileTop = undefined
        return
      }
      stage = 'busy'
      used = true
      const end = gather(0, true)
      later(end, () => (stage = 'idle'))
    })
  })

  // The top card in the hand: dragged, it follows; let go, the draw flies from there.
  let held = $state<{ x: number; y: number }>()
  let pressed: { x: number; y: number } | undefined
  let letGo: { x: number; y: number } | undefined
  const at = (e: PointerEvent) => {
    const rect = tableEl!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function down(e: PointerEvent) {
    if (stage === 'busy') return skip()
    pressed = at(e)
    try {
      tableEl?.setPointerCapture(e.pointerId)
    } catch {
      // Without capture, the drag ends where the pointer leaves.
    }
  }
  function move(e: PointerEvent) {
    if (!pressed || spread) return
    const p = at(e)
    if (held || Math.hypot(p.x - pressed.x, p.y - pressed.y) > 6) held = p
  }
  function release(e: PointerEvent) {
    if (!pressed) return
    pressed = undefined
    if (held) letGo = at(e)
    held = undefined
    draw()
  }
  function draw() {
    if (stage === 'busy') return skip()
    onagain()
  }

  const hint = $derived(!lying.length && stage === 'idle' ? (spread ? text.spread : text.hint) : '')
  const transformOf = (l: Lying) => {
    const turn = l.across ? ' rotate(90deg)' : ''
    if (!l.offset) return `translate(-50%, -50%)${turn}`
    const { dx, dy, scale } = l.offset
    return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})${turn}`
  }
</script>

<div class="card-table">
  <div
    class="play-cloth cloth"
    class:spread
    bind:this={tableEl}
    onpointermove={move}
    onpointerup={release}
    role="presentation"
  >
    <DeckStack
      width={deckWidth}
      {back}
      x={deckAt.x}
      y={deckAt.y}
      label={text.deck}
      ready={stage !== 'busy'}
      {riffling}
      onpointerdown={down}
      ondraw={draw}
    />
    {#if left !== undefined}
      <span class="left" style:left="{deckAt.x}px">{text.left.replace('{left}', String(left))}</span
      >
    {/if}
    {#if !spread}
      <!-- The discard pile: the last card that left the row, face up. -->
      <span
        class="pile"
        style:left="{places.pile.x}px"
        style:top="{places.pile.y}px"
        style:--w="{places.pile.width}px"
      >
        {#if pileTop}
          <TableCard
            face={pileTop.face}
            caption={pileTop.caption}
            {back}
            width={places.pile.width}
            x={places.pile.width / 2}
            y={places.pile.width * 0.8}
            transform="translate(-50%, -50%)"
            up
          />
        {/if}
      </span>
      <span class="pile-name" style:left="{places.pile.x}px">{text.discard}</span>
    {/if}
    {#each lying as l (l.key)}
      <TableCard
        face={l.card.face}
        caption={l.card.caption}
        {back}
        width={l.width}
        x={l.x}
        y={l.y}
        transform={transformOf(l)}
        up={l.up}
        flying={moves}
        over={l.across}
        turnable={l.turnable && !l.up}
        onturn={() => turn(l.key)}
      />
    {/each}
    {#if held}
      <!-- The top card, in the hand. -->
      <span
        class="in-hand"
        style:left="{held.x}px"
        style:top="{held.y}px"
        style:transform="translate(-50%, -50%) rotate({Math.max(
          -12,
          Math.min(12, (held.x - deckCentre.x) / 30),
        )}deg)"
      >
        <CardBack width={places.spots[0]?.width ?? 100} {back} />
      </span>
    {/if}
    {#if hint}<p class="cloth-hint">{hint}</p>{/if}
  </div>
  {#if spread && stage === 'turning'}
    <div class="under">
      <p class="said" aria-live="polite">
        {#if latest}<StyledText text={latest} />{:else}<span class="muted">{text.turn}</span>{/if}
      </p>
      <button class="button" onclick={turnAll}>{text.turnAll}</button>
    </div>
  {/if}
</div>

<style>
  .card-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* As wide as where it lives, its height following its width; a spread taller, for its rows. */
  .cloth {
    aspect-ratio: 2.4;
    min-height: 170px;
    max-height: 290px;
  }

  .cloth.spread {
    aspect-ratio: 1.3;
    min-height: 260px;
    max-height: 460px;
  }

  .left,
  .pile-name {
    position: absolute;
    bottom: 8px;
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    pointer-events: none;
  }

  .pile-name {
    translate: -50% 0;
  }

  .pile {
    position: absolute;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
    translate: -50% -50%;
  }

  .in-hand {
    position: absolute;
    z-index: 3;
    pointer-events: none;
  }

  .in-hand :global(.back) {
    box-shadow: 0 18px 14px rgb(0 0 0 / 50%);
  }

  .under {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .said {
    flex: 1;
    min-height: 1.5em;
    margin: 0;
    font-family: Georgia, serif;
    font-size: 16px;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
