<script lang="ts">
  import type { DieShape } from './diceTray'

  /**
   * One die drawn as its shape (d4 to d20, d%, Fudge as a square, any other as a round one)
   * with a face, sized by `--die` (the dice tray's, the throw's). `dropped` fades it, outline
   * dashed (a keep left it out); `tumble` rolls it in as it appears, `delay` and `duration` in ms.
   */
  let {
    shape,
    face,
    label,
    dropped = false,
    tumble = false,
    delay,
    duration,
  }: {
    shape: DieShape
    face: string
    /** Its name for those who can't see it (_d6: 4_). */
    label: string
    dropped?: boolean
    tumble?: boolean
    delay?: number
    duration?: number
  } = $props()

  /** Each shape's outline, in a 40 × 40 box. */
  const OUTLINES: Record<Exclude<DieShape, 6 | 'fudge' | 'round'>, string> = {
    4: '20,3 37,35 3,35',
    8: '20,2 38,20 20,38 2,20',
    10: '20,2 37,16 20,38 3,16',
    percent: '20,2 37,16 20,38 3,16',
    12: '20,2 38,15 31,37 9,37 2,15',
    20: '20,2 37,11 37,29 20,38 3,29 3,11',
  }
  /** A d4's face sits low, in the triangle's body. */
  const faceY = $derived(shape === 4 ? 27 : 21)
</script>

<svg
  class="die"
  class:dropped
  class:tumble
  style:animation-delay={tumble && delay !== undefined ? `${delay}ms` : undefined}
  style:animation-duration={tumble && duration !== undefined ? `${duration}ms` : undefined}
  viewBox="0 0 40 40"
  role="img"
  aria-label={label}
>
  {#if shape === 6 || shape === 'fudge'}
    <rect x="5" y="5" width="30" height="30" rx="6" />
  {:else if shape === 'round'}
    <circle cx="20" cy="20" r="17" />
  {:else}
    <polygon points={OUTLINES[shape]} />
  {/if}
  <text x="20" y={faceY} class:small={face.length > 2}>{face}</text>
</svg>

<style>
  .die {
    width: var(--die, 22px);
    height: var(--die, 22px);
    flex-shrink: 0;
    overflow: visible;
  }

  .die :is(rect, circle, polygon) {
    fill: var(--panel);
    stroke: var(--accent);
    stroke-width: var(--die-stroke, 2);
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

  /* Thrown in, tumbling over and bouncing twice before it settles. */
  .tumble {
    animation: tumble 1200ms ease-out both;
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

  @media (prefers-reduced-motion: reduce) {
    .tumble {
      animation: none;
    }
  }
</style>
