<script lang="ts">
  import { untrack } from 'svelte'
  import { landAt, layCards, type CardTable, type LaidCard } from './cardDeal'
  import { dicePreferences } from './dicePreferences.svelte'
  import { swish } from './diceSound'
  import { markdownText } from './markdown'
  import { packImageUrl } from './packImages'
  import PlayingCard from './PlayingCard.svelte'
  import { portal } from './portal'
  import StyledText from './StyledText.svelte'

  type Face = import('svelte').ComponentProps<typeof PlayingCard>['face']

  /**
   * A draw from a deck played on a table, as the dice are thrown (docs/cards.md): the deck face
   * down at the left with the cards it has left, the cards drawn (made already: the table only
   * shows them) dealt from it and turned over. One card is the player's to draw: a click on the
   * deck deals it to the middle, a drag drops it where the hand lets go; reversed, it lands
   * upside down. A spread (`place`s) is dealt face down to its places at once, each card turned
   * by a click on it, or all with **Turn all**; each card's text shows as it's turned. When the
   * deck was gathered for this draw (`shuffled`), the cards drawn before (`pile`, the last one's
   * face) go back face down onto it and it's riffled first; with no cards (a shuffle by hand),
   * that's all, and it's taken.
   *
   * `watch`: the computer's draw, dealt and turned by itself, taken (`onuse`) a moment after
   * the last card is up; a click on it, or **Skip**, takes it at once. Without motion (the
   * player's preference, or the system's reduce motion) the cards are shown turned at once.
   * Swishes are heard unless the player turned the table's sounds off.
   */
  let {
    cards,
    title = '',
    use = '',
    close = '',
    back,
    left,
    shuffled = false,
    pile,
    watch = false,
    locale = 'en',
    onuse,
    onclose,
  }: {
    /** The cards drawn, in the order they're dealt: each its face, its text, its place. */
    cards: readonly {
      face: Face
      caption?: string
      place?: { at?: [number, number]; across?: boolean }
    }[]
    /** What it's drawn for (the deck's or the spread's name). */
    title?: string
    /** What the button that takes it says ('': _See it_). */
    use?: string
    /** What the button that puts it away says ('': _Put away_). */
    close?: string
    /** The deck's back, a pack's picture (`<pack>/<path>`); none: the table's own. */
    back?: string
    /** The cards left in the deck after this draw. */
    left?: number
    /** The deck was gathered and shuffled for this draw: seen first. */
    shuffled?: boolean
    /** The face of the last card drawn before it, lying on the pile (gathered when shuffled). */
    pile?: Face
    /** The computer's draw, dealt by itself and taken a moment after it's all up. */
    watch?: boolean
    locale?: string
    /** Seen: taken. */
    onuse: () => void
    /** Put away before it's all seen. */
    onclose?: () => void
  } = $props()

  const TEXT = {
    en: {
      hint: 'Click the deck, or drag its top card onto the table.',
      spread: 'Click the deck to deal.',
      turn: 'Click a card to turn it over.',
      deck: 'The deck: click it to draw',
      left: '{left} left',
      drawn: 'Drawn',
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
      see: 'Verla',
      close: 'Guardar',
      turnAll: 'Volver todas',
      skip: 'Saltar',
      shuffling: 'Barajando…',
      dealing: 'Repartiendo…',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)

  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const moves = dicePreferences.animate && !reduced
  const hear = (strength: number, seconds?: number) => {
    if (dicePreferences.sound) swish(strength, seconds)
  }

  /** One card is drawn by the player's hand; several are dealt to their places. */
  const single = $derived(cards.length === 1)
  /** The deck's width on the table, and the room it keeps. */
  const DECK = 84
  let table = $state<CardTable>({ width: 600, height: 320, deck: DECK + 40 })
  let tableEl: HTMLDivElement | undefined = $state()
  $effect(() => {
    if (!tableEl) return
    const rect = tableEl.getBoundingClientRect()
    if (rect.width > 0) table = { width: rect.width, height: rect.height, deck: DECK + 40 }
  })
  const laid = $derived(layCards(cards, table))
  /** The single card, let go somewhere by the hand: it lies there. */
  let dropped = $state<{ x: number; y: number }>()
  /** Where the hand let it go: it flies on from there, not from the deck. */
  let letGo = $state<{ x: number; y: number }>()
  const spots = $derived(
    laid.map((l, i): LaidCard => (i === 0 && dropped ? { ...l, ...dropped } : l)),
  )
  /** The deck's top card, the centre cards fly from. */
  const from = $derived({ x: 20 + DECK / 2, y: table.height / 2 })

  type Stage = 'shuffle' | 'hand' | 'dealing' | 'turning' | 'done'
  let stage = $state<Stage>(moves ? (untrack(() => shuffled) ? 'shuffle' : 'hand') : 'done')
  /** Each card: dealt onto the table yet, turned up yet. */
  let dealt = $state<boolean[]>(untrack(() => cards.map(() => !moves)))
  let up = $state<boolean[]>(untrack(() => cards.map(() => !moves)))
  /** The card last turned up, whose text shows. */
  let latest = $state(untrack(() => (moves ? -1 : cards.length - 1)))
  /** Cards on the pile while it's gathered back. */
  let gathering = $state(false)
  let riffling = $state(false)

  const timers: ReturnType<typeof setTimeout>[] = []
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
  $effect(() => () => timers.forEach(clearTimeout))

  // Gathered first: the pile goes back face down, then the deck is riffled.
  $effect(() => {
    if (stage !== 'shuffle') return
    untrack(() => {
      gathering = true
      hear(0.4, 0.1)
      later(520, () => {
        gathering = false
        riffling = true
        for (let k = 0; k < 6; k++) later(560 + k * 60, () => hear(0.25, 0.05))
        later(1250, () => hear(0.6, 0.12))
      })
      later(1900, () => {
        riffling = false
        // A shuffle by hand deals nothing: it's done once riffled.
        if (!cards.length) return take()
        stage = watch ? 'dealing' : 'hand'
        if (watch) deal()
      })
    })
  })
  // Watched: dealt as soon as the table is there.
  $effect(() => {
    if (!watch || stage !== 'hand' || !tableEl) return
    untrack(() => deal())
  })

  /** The cards fly from the deck, one after another; one card, or a watched draw, turns as it goes. */
  function deal() {
    if (stage !== 'hand' && stage !== 'dealing') return
    stage = 'dealing'
    const each = single ? 0 : 170
    cards.forEach((_, i) =>
      later(i * each, () => {
        dealt[i] = true
        hear(0.5)
        if (single || watch) later(single ? 240 : 300, () => turn(i))
      }),
    )
    later(cards.length * each + 450, () => {
      if (stage === 'dealing') stage = up.every(Boolean) ? 'done' : 'turning'
    })
  }

  function turn(i: number) {
    if (up[i] || !dealt[i]) return
    up[i] = true
    latest = i
    hear(0.35, 0.1)
    if (up.every(Boolean)) later(450, () => (stage = 'done'))
  }

  function turnAll() {
    cards.forEach((_, i) => later(i * 140, () => turn(i)))
  }

  /** Watched: taken a moment after it's all up (or at once, skipped), once. */
  let taken = false
  function take() {
    if (taken) return
    taken = true
    onuse()
  }
  $effect(() => {
    if (!watch || stage !== 'done') return
    const wait = setTimeout(take, 1400)
    return () => clearTimeout(wait)
  })

  // The top card in the hand: dragged, it follows; let go, it lands there.
  let held = $state<{ x: number; y: number }>()
  let pressed: { x: number; y: number } | undefined
  const at = (e: PointerEvent) => {
    const rect = tableEl!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function down(e: PointerEvent) {
    if (watch || stage !== 'hand') return
    pressed = at(e)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Without capture, the drag ends where the pointer leaves.
    }
  }
  function move(e: PointerEvent) {
    if (!pressed || !single) return
    const p = at(e)
    if (held || Math.hypot(p.x - pressed.x, p.y - pressed.y) > 6) held = p
  }
  function release(e: PointerEvent) {
    if (!pressed) return
    pressed = undefined
    if (held && single) {
      const p = at(e)
      dropped = landAt(p.x, p.y, laid[0]?.width ?? 100, table)
      letGo = p
      held = undefined
    }
    deal()
  }

  /** Where a card is drawn: on the deck until it's dealt, then at its place. */
  function placeOf(i: number): string {
    const spot = spots[i]
    if (!spot) return ''
    if (dealt[i]) return `translate(-50%, -50%) rotate(${spot.across ? 90 : 0}deg)`
    const start = i === 0 && letGo ? letGo : from
    const dx = start.x - spot.x
    const dy = start.y - spot.y
    const scale = i === 0 && letGo ? 1 : DECK / spot.width
    return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`
  }

  const backUrl = $derived(packImageUrl(back))
  const shownText = $derived(latest >= 0 ? cards[latest]?.caption : undefined)
  const hint = $derived(
    stage === 'hand' && !watch
      ? single
        ? text.hint
        : text.spread
      : stage === 'turning' && !watch
        ? text.turn
        : '',
  )
</script>

{#snippet backFace(width: number)}
  <span class="back" class:picture={backUrl} style:--w="{width}px">
    {#if backUrl}<img src={backUrl} alt="" draggable="false" />{/if}
  </span>
{/snippet}

<div class="deal" use:portal role="dialog" aria-modal="true" aria-label={title || text.deck}>
  <div class="box">
    {#if title}<p class="title"><StyledText text={title} /></p>{/if}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="table"
      bind:this={tableEl}
      onpointermove={move}
      onpointerup={release}
      onclick={() => watch && stage !== 'shuffle' && take()}
    >
      <!-- The deck, face down, with the cards it has left. -->
      <button
        class="deck"
        class:ready={stage === 'hand' && !watch}
        class:riffling
        style:left="20px"
        style:top="{table.height / 2}px"
        style:--w="{DECK}px"
        aria-label={text.deck}
        disabled={stage !== 'hand' || watch}
        onpointerdown={down}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            deal()
          }
        }}
      >
        {#each [0, 1, 2, 3] as k (k)}
          <span class="stacked" style:--k={k}>{@render backFace(DECK)}</span>
        {/each}
        {#if riffling}
          {#each Array.from({ length: 10 }, (_, k) => k) as k (k)}
            <span class="riffle" style:--k={k} class:right={k % 2 === 1}
              >{@render backFace(DECK)}</span
            >
          {/each}
        {/if}
      </button>
      {#if left !== undefined}
        <span class="left">{text.left.replace('{left}', String(left))}</span>
      {/if}
      {#if shuffled && pile && (stage === 'shuffle' || !moves)}
        <!-- The last card drawn before, gathered back face down onto the deck. -->
        <span
          class="card gathered"
          class:home={gathering || riffling}
          style:--w="56px"
          style:right="24px"
          style:top="{table.height / 2}px"
          style:--dx="{-(table.width - 24 - 28 - from.x)}px"
        >
          <span class="inner" class:up={!gathering && !riffling}>
            {@render backFace(56)}
            <span class="front"><PlayingCard face={{ ...pile, turned: false }} width={56} /></span>
          </span>
        </span>
      {/if}

      {#if stage !== 'shuffle'}
        {#each cards as card, i (i)}
          {@const spot = spots[i]}
          {#if spot}
            <!-- A card waiting to be turned is a button; until then it's only drawn. -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <span
              class="card"
              class:flying={moves}
              class:hidden={!dealt[i] && stage === 'hand'}
              class:turnable={stage === 'turning' && !up[i] && !watch}
              class:over={spot.across}
              style:--w="{spot.width}px"
              style:left="{spot.x}px"
              style:top="{spot.y}px"
              style:transform={placeOf(i)}
              role={stage === 'turning' && !up[i] && !watch ? 'button' : undefined}
              tabindex={stage === 'turning' && !up[i] && !watch ? 0 : undefined}
              onkeydown={(e) => {
                if (watch || (e.key !== 'Enter' && e.key !== ' ')) return
                e.preventDefault()
                turn(i)
              }}
              aria-label={up[i] ? markdownText(card.caption ?? '') : undefined}
              onclick={(e) => {
                if (watch) return
                e.stopPropagation()
                turn(i)
              }}
            >
              <span class="inner" class:up={up[i]} class:turned={card.face.turned}>
                {@render backFace(spot.width)}
                <span class="front">
                  <PlayingCard
                    face={{ ...card.face, turned: false }}
                    width={spot.width}
                    label={markdownText(card.caption ?? '')}
                  />
                </span>
              </span>
            </span>
          {/if}
        {/each}
      {/if}
      {#if held}
        <!-- The top card, in the hand. -->
        <span
          class="card held"
          style:--w="{laid[0]?.width ?? 100}px"
          style:left="{held.x}px"
          style:top="{held.y}px"
          style:transform="translate(-50%, -50%) rotate({Math.max(
            -12,
            Math.min(12, (held.x - from.x) / 30),
          )}deg)"
        >
          <span class="inner">{@render backFace(laid[0]?.width ?? 100)}</span>
        </span>
      {/if}
      {#if hint}<p class="hint">{hint}</p>{/if}
    </div>
    <div class="foot">
      <p class="said" aria-live="polite">
        {#if stage === 'shuffle'}
          <span class="muted">{text.shuffling}</span>
        {:else if stage === 'dealing' && latest < 0}
          <span class="muted">{text.dealing}</span>
        {:else if shownText}
          <StyledText text={shownText} />
        {/if}
      </p>
      {#if watch}
        <button class="button" onclick={take}>{text.skip}</button>
      {:else}
        {#if stage === 'turning'}
          <button class="button" onclick={turnAll}>{text.turnAll}</button>
        {/if}
        {#if stage === 'done'}
          <button class="button primary" onclick={take}>{use || text.see}</button>
        {/if}
        <button class="button" onclick={() => onclose?.()}>{close || text.close}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .deal {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.55);
  }

  .box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(720px, 100%);
    padding: 14px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.5);
  }

  .title {
    margin: 0;
    font-weight: 600;
  }

  /* The cloth the cards are dealt on, as the dice's. */
  .table {
    position: relative;
    height: min(380px, 56vh);
    overflow: hidden;
    background: radial-gradient(circle at 50% 40%, var(--panel), var(--canvas-bg));
    border: 2px solid var(--panel-border);
    border-radius: 12px;
    touch-action: none;
    user-select: none;
    perspective: 1100px;
  }

  .deck {
    position: absolute;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    padding: 0;
    background: none;
    border: none;
    border-radius: calc(var(--w) * 0.07);
    transform: translateY(-50%);
    cursor: default;
  }

  .deck.ready {
    cursor: grab;
  }

  .deck.ready:active {
    cursor: grabbing;
  }

  .deck:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }

  .stacked {
    position: absolute;
    top: calc(var(--k) * -1.5px);
    left: calc(var(--k) * -1.5px);
  }

  /* The top card glows while it waits for the hand. */
  .deck.ready .stacked:last-child .back {
    animation: glow 1.6s ease-in-out infinite alternate;
  }

  .deck.ready:hover .stacked:last-child {
    translate: 0 -5px;
    transition: translate 0.15s;
  }

  @keyframes glow {
    from {
      box-shadow:
        0 0 0 1px rgb(200 162 74 / 50%),
        0 0 6px rgb(200 162 74 / 20%);
    }

    to {
      box-shadow:
        0 0 0 2px var(--accent),
        0 0 20px rgb(200 162 74 / 50%);
    }
  }

  .deck.riffling .stacked {
    visibility: hidden;
  }

  /* The riffle: two halves pulled apart, then falling back in turn. */
  .riffle {
    position: absolute;
    top: calc(var(--k) * -1.2px);
    left: 0;
    z-index: 2;
    animation: riffle-left 1.5s ease-in-out both;
    animation-delay: calc(var(--k) * 15ms);
  }

  .riffle.right {
    animation-name: riffle-right;
  }

  @keyframes riffle-left {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }

    35%,
    50% {
      transform: translate(-8px, -12px) rotate(-9deg);
    }

    75% {
      transform: translate(54px, 0) rotate(0deg);
    }

    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }

  @keyframes riffle-right {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }

    35%,
    54% {
      transform: translate(116px, -12px) rotate(9deg);
    }

    78% {
      transform: translate(54px, 0) rotate(0deg);
    }

    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }

  .left {
    position: absolute;
    bottom: 10px;
    left: 20px;
    font-size: 12px;
    color: var(--text-muted);
  }

  /* A card: its back and its face, turned over in 3D. */
  .card {
    position: absolute;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    transform-style: preserve-3d;
  }

  .card.flying {
    transition: transform 0.55s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .card.hidden {
    visibility: hidden;
  }

  .card.over {
    z-index: 2;
  }

  .card.turnable {
    cursor: pointer;
  }

  .card.turnable:hover {
    filter: drop-shadow(0 0 8px rgb(200 162 74 / 60%));
  }

  .card.held {
    z-index: 3;
    filter: drop-shadow(0 18px 14px rgb(0 0 0 / 50%));
    pointer-events: none;
  }

  .inner {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transition: transform 0.5s cubic-bezier(0.3, 0.7, 0.3, 1);
  }

  .inner.up {
    transform: rotateY(180deg);
  }

  /* Reversed, it lands upside down. */
  .inner.up.turned {
    transform: rotateY(180deg) rotateZ(180deg);
  }

  .inner > :global(*) {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
  }

  .front {
    display: block;
    transform: rotateY(180deg);
  }

  .back {
    display: block;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    overflow: hidden;
    background:
      repeating-linear-gradient(45deg, transparent 0 6px, rgb(200 162 74 / 22%) 6px 7px),
      repeating-linear-gradient(-45deg, transparent 0 6px, rgb(200 162 74 / 22%) 6px 7px),
      linear-gradient(var(--card-back), var(--card-back-deep));
    border: 1px solid var(--card-back-edge);
    border-radius: calc(var(--w) * 0.07);
    box-shadow: 0 3px 10px rgb(0 0 0 / 45%);
  }

  .back:not(.picture)::after {
    position: absolute;
    inset: 7%;
    content: '';
    border: 1px solid rgb(200 162 74 / 55%);
    border-radius: calc(var(--w) * 0.04);
  }

  .back img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* The pile's card going back onto the deck. */
  .gathered {
    transform: translateY(-50%);
    transition: transform 0.5s cubic-bezier(0.4, 0.1, 0.3, 1);
  }

  .gathered.home {
    transform: translate(var(--dx), -50%) scale(1.5);
    opacity: 0;
    transition:
      transform 0.5s cubic-bezier(0.4, 0.1, 0.3, 1),
      opacity 0.1s 0.45s;
  }

  .hint {
    position: absolute;
    top: 10px;
    right: 0;
    left: 0;
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    pointer-events: none;
  }

  .foot {
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

  @media (prefers-reduced-motion: reduce) {
    .card.flying,
    .inner {
      transition: none;
    }
  }
</style>
