<script lang="ts">
  import CardBack from './CardBack.svelte'
  import { markdownText } from './markdown'
  import PlayingCard from './PlayingCard.svelte'

  type Face = import('svelte').ComponentProps<typeof PlayingCard>['face']

  /**
   * A card lying on the table (docs/cards.md): its back and its face, turned over in 3D (`up`),
   * upside down when it came out reversed (`face.turned`). Placed with its centre at `x`, `y`
   * and moved by `transform` (where it flies from, a quarter turn across another); `flying`
   * eases each move. `turnable`: face down, a click (or Enter) turns it (`onturn`), and it
   * glows under the pointer.
   */
  let {
    face,
    caption = '',
    back,
    width,
    x,
    y,
    transform,
    up,
    flying = false,
    hidden = false,
    over = false,
    held = false,
    turnable = false,
    onturn,
  }: {
    face: Face
    /** What it says, for those who can't see it once it's up. */
    caption?: string
    back?: string
    width: number
    x: number
    y: number
    transform: string
    up: boolean
    flying?: boolean
    hidden?: boolean
    over?: boolean
    held?: boolean
    turnable?: boolean
    onturn?: () => void
  } = $props()
  const label = $derived(markdownText(caption))
</script>

<!-- A card waiting to be turned is a button; until then it's only drawn. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span
  class="card"
  class:flying
  class:hidden
  class:turnable
  class:over
  class:held
  style:--w="{width}px"
  style:left="{x}px"
  style:top="{y}px"
  style:transform
  role={turnable ? 'button' : undefined}
  tabindex={turnable ? 0 : undefined}
  aria-label={up ? label : undefined}
  onkeydown={(e) => {
    if (!turnable || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    e.stopPropagation()
    onturn?.()
  }}
  onclick={(e) => {
    if (!turnable) return
    e.stopPropagation()
    onturn?.()
  }}
>
  <span class="inner" class:up class:turned={face.turned}>
    <CardBack {width} {back} />
    <span class="front">
      <PlayingCard face={{ ...face, turned: false }} {width} {label} />
    </span>
  </span>
</span>

<style>
  /* A card: its back and its face, turned over in 3D. */
  .card {
    position: absolute;
    width: var(--w);
    height: calc(var(--w) * 1.6);
    transform-style: preserve-3d;
  }

  .card.flying {
    transition:
      transform 0.55s cubic-bezier(0.2, 0.7, 0.3, 1),
      left 0.4s ease,
      top 0.4s ease;
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

  /* Glows and lifts are shadows on the faces, never a filter on the card: a filter flattens
     the turn in 3D, and the face turned away shows through the one on top. */
  .card.turnable:hover .inner > :global(*) {
    box-shadow:
      0 0 9px 2px rgb(200 162 74 / 55%),
      0 3px 10px rgb(0 0 0 / 45%);
  }

  .card.turnable:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .card.held {
    z-index: 3;
    pointer-events: none;
  }

  .card.held .inner > :global(*) {
    box-shadow: 0 18px 14px rgb(0 0 0 / 50%);
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

  @media (prefers-reduced-motion: reduce) {
    .card.flying,
    .inner {
      transition: none;
    }
  }
</style>
