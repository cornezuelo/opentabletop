<script lang="ts">
  import CardBack from './CardBack.svelte'

  /**
   * A deck lying face down on the table (docs/cards.md), its left edge at `x` and its middle
   * at `y`: a few backs stacked, the top one lifting and glowing under the pointer while it can
   * be drawn from (`ready`), and glowing on its own while the table waits for the hand
   * (`waiting`). `riffling`: split in two halves that fall back together. A click, a drag
   * (`onpointerdown`) or Enter draws.
   */
  let {
    width,
    back,
    x,
    y,
    label,
    ready = false,
    waiting = false,
    riffling = false,
    onpointerdown,
    ondraw,
  }: {
    width: number
    back?: string
    x: number
    y: number
    label: string
    ready?: boolean
    waiting?: boolean
    riffling?: boolean
    onpointerdown?: (e: PointerEvent) => void
    /** Drawn from by the keyboard. */
    ondraw?: () => void
  } = $props()
</script>

<button
  class="deck"
  class:ready
  class:waiting={ready && waiting}
  class:riffling
  style:left="{x}px"
  style:top="{y}px"
  style:--w="{width}px"
  aria-label={label}
  disabled={!ready}
  {onpointerdown}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      ondraw?.()
    }
  }}
>
  {#each [0, 1, 2, 3] as k (k)}
    <span class="stacked" style:--k={k}><CardBack {width} {back} /></span>
  {/each}
  {#if riffling}
    {#each Array.from({ length: 10 }, (_, k) => k) as k (k)}
      <span class="riffle" style:--k={k} class:right={k % 2 === 1}><CardBack {width} {back} /></span
      >
    {/each}
  {/if}
</button>

<style>
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

  /* Glows are shadows on the back, never a filter. Under the pointer, it lifts and glows. */
  .deck.ready:hover .stacked:last-child {
    translate: 0 -5px;
    transition: translate 0.15s;
  }

  .deck.ready:hover .stacked:last-child > :global(.back) {
    box-shadow:
      0 0 0 2px var(--accent),
      0 0 18px rgb(200 162 74 / 50%);
  }

  /* While the table waits for the hand, the top card glows by itself. */
  .deck.waiting .stacked:last-child > :global(.back) {
    animation: glow 1.6s ease-in-out infinite alternate;
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
      transform: translate(calc(var(--w) * 0.64), 0) rotate(0deg);
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
      transform: translate(calc(var(--w) * 1.38), -12px) rotate(9deg);
    }

    78% {
      transform: translate(calc(var(--w) * 0.64), 0) rotate(0deg);
    }

    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .riffle {
      animation: none;
    }
  }
</style>
