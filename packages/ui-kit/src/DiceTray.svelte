<script lang="ts">
  import type { DiceResult } from '@open-tabletop/dice'
  import {
    drawRoll,
    ROLL_MS,
    ROLL_STAGGER_MS,
    rollingFace,
    type DieShape,
    type DrawnDie,
    type DrawnRoll,
  } from './diceTray'
  import { dicePreferences } from './dicePreferences.svelte'

  /**
   * The dice of one or more rolls, each die drawn as its shape with its face (d4 to d20, d%,
   * Fudge, d66 as two d6): those a keep left out faded, exploding ones chained, then what's
   * added and the total; the totals a roll mode didn't keep, small and faded. `large` for a
   * roll up front; `animate` rolls them as they appear (a roll just made): each tumbles and
   * bounces, its faces turning, for a moment long enough to watch (`ROLL_MS`), the total
   * shown once they settle; unless the player turned it off or the system reduces motion.
   */
  let {
    rolls,
    locale = 'en',
    large = false,
    animate = false,
  }: {
    rolls: readonly Pick<DiceResult, 'expression' | 'terms' | 'total' | 'discarded' | 'byHand'>[]
    locale?: string
    large?: boolean
    animate?: boolean
  } = $props()

  const TEXT = {
    en: { byHand: 'rolled by hand', notKept: 'not kept', die: 'd{sides}: {face}' },
    es: { byHand: 'tirada a mano', notKept: 'no se queda', die: 'd{sides}: {face}' },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)
  const drawn = $derived(rolls.map((r) => drawRoll(r)))
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const tumbles = $derived(animate && dicePreferences.animate && !reduced)
  /** While they roll: the faces turn (a tick each time), the total waits. */
  let rolling = $state(false)
  let tick = $state(0)
  $effect(() => {
    void rolls
    if (!tumbles) return
    rolling = true
    const turning = setInterval(() => tick++, 90)
    const settle = setTimeout(
      () => {
        rolling = false
        clearInterval(turning)
      },
      ROLL_MS + ROLL_STAGGER_MS * 3,
    )
    return () => {
      clearInterval(turning)
      clearTimeout(settle)
    }
  })
  /** What a die shows: a face turning while it rolls, its own once settled. */
  const shown = (shape: DieShape, face: string) =>
    rolling ? (void tick, rollingFace(shape, Math.random())) : face

  /** Each shape's outline, in a 40 × 40 box. */
  const OUTLINES: Record<Exclude<DieShape, 6 | 'fudge' | 'round'>, string> = {
    4: '20,3 37,35 3,35',
    8: '20,2 38,20 20,38 2,20',
    10: '20,2 37,16 20,38 3,16',
    percent: '20,2 37,16 20,38 3,16',
    12: '20,2 38,15 31,37 9,37 2,15',
    20: '20,2 37,11 37,29 20,38 3,29 3,11',
  }
  const sidesName = (shape: DieShape) =>
    shape === 'percent' ? '%' : shape === 'fudge' ? 'F' : shape === 'round' ? '' : String(shape)
  /** A d4's face sits low, in the triangle's body. */
  const faceY = (shape: DieShape) => (shape === 4 ? 27 : 21)
</script>

{#snippet die(d: DrawnDie, face: string, i: number)}
  <svg
    class="die"
    class:dropped={d.dropped}
    class:tumble={tumbles}
    style:animation-delay={tumbles ? `${i * ROLL_STAGGER_MS}ms` : undefined}
    style:animation-duration={tumbles ? `${ROLL_MS}ms` : undefined}
    viewBox="0 0 40 40"
    role="img"
    aria-label={text.die.replace('{sides}', sidesName(d.shape)).replace('{face}', face || '0')}
  >
    {#if d.shape === 6 || d.shape === 'fudge'}
      <rect x="5" y="5" width="30" height="30" rx="6" />
    {:else if d.shape === 'round'}
      <circle cx="20" cy="20" r="17" />
    {:else}
      <polygon points={OUTLINES[d.shape]} />
    {/if}
    <text x="20" y={faceY(d.shape)} class:small={face.length > 2}>{shown(d.shape, face)}</text>
  </svg>
{/snippet}

{#snippet roll(r: DrawnRoll, kept: boolean)}
  <span class="roll" class:other={!kept}>
    {#if r.byHand}
      <span class="hand">{text.byHand}</span>
    {:else}
      {#each r.parts as part, p (p)}
        {#if part.kind === 'mod'}
          <span class="mod">{part.text}</span>
        {:else}
          {#if p > 0 || part.sign < 0}<span class="mod">{part.sign < 0 ? '−' : '+'}</span>{/if}
          {#each part.dice as d, i (i)}
            <span class="chain" class:exploded={d.more.length > 0}>
              {@render die(d, d.face, i)}
              {#each d.more as face, j (j)}<span class="plus">+</span>{@render die(
                  d,
                  face,
                  i + j + 1,
                )}{/each}
            </span>
          {/each}
        {/if}
      {/each}
    {/if}
    <span class="total" class:waiting={rolling}>= {rolling ? '…' : r.total}</span>
  </span>
{/snippet}

<span
  class="tray"
  class:large
  aria-label={rolls.map((r) => `${r.expression} → ${r.total}`).join('; ')}
>
  {#each drawn as r, i (i)}
    <span class="one">
      {@render roll(r, true)}
      {#each r.others as other, j (j)}
        <span class="not-kept" aria-label={text.notKept}>{@render roll(other, false)}</span>
      {/each}
    </span>
  {/each}
</span>

<style>
  .tray {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: center;
    --die: 22px;
  }

  .large {
    --die: 36px;
    gap: 6px 16px;
  }

  .one,
  .roll,
  .chain {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 3px;
    align-items: center;
  }

  .one {
    gap: 3px 10px;
  }

  .die {
    width: var(--die);
    height: var(--die);
    flex-shrink: 0;
    overflow: visible;
  }

  .die :is(rect, circle, polygon) {
    fill: var(--panel);
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .die text {
    font-family: ui-monospace, monospace;
    font-size: 15px;
    font-weight: 700;
    fill: var(--text);
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .die text.small {
    font-size: 12px;
  }

  /* Left out by a keep: faded, its outline dashed. */
  .die.dropped {
    opacity: 0.4;
  }

  .die.dropped :is(rect, circle, polygon) {
    stroke: var(--text-muted);
    stroke-dasharray: 3 3;
  }

  .chain.exploded .die :is(rect, circle, polygon) {
    stroke-width: 3;
  }

  .plus,
  .mod {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-muted);
  }

  .large .mod,
  .large .plus {
    font-size: 15px;
  }

  .total {
    font-weight: 700;
    color: var(--text);
  }

  .large .total {
    font-size: 18px;
  }

  .hand {
    font-style: italic;
    color: var(--text-muted);
  }

  /* What a roll mode didn't keep: small and faded. */
  .not-kept {
    --die: 16px;
    opacity: 0.5;
  }

  .large .not-kept {
    --die: 24px;
  }

  /* Thrown in, tumbling over and bouncing twice before it settles. */
  .tumble {
    animation: tumble ease-out both;
  }

  @keyframes tumble {
    0% {
      opacity: 0;
      transform: translate(-30px, -18px) rotate(-540deg) scale(0.6);
    }
    35% {
      opacity: 1;
      transform: translate(-8px, 0) rotate(-200deg) scale(1);
    }
    55% {
      transform: translate(0, -8px) rotate(-60deg);
    }
    75% {
      transform: translate(0, 0) rotate(10deg);
    }
    88% {
      transform: translate(0, -2px) rotate(-4deg);
    }
    100% {
      transform: none;
    }
  }

  .total.waiting {
    opacity: 0.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .tumble {
      animation: none;
    }
  }
</style>
