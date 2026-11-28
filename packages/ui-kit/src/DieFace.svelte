<script lang="ts">
  import type { DieShape } from './diceTray'

  /**
   * One die drawn as its solid (d4 to d20, d%, Fudge as a cube, a d2 as a coin; a die with no
   * solid of its own as the one it's rolled with, a d3 as a d6) with a face, lit from above;
   * with no face yet (in the hand, before it's thrown), what it is in the face's place
   * (_d6_). Sized by `--die` (the dice tray's, the throw's). `dropped` fades it, outline dashed (a keep
   * left it out); `tumble` rolls it in as it appears, `delay` and `duration` in ms. `turned`
   * (degrees) is how far it's turned where it's drawn: its light stays above, so a die
   * spinning on the table is lit as a solid would be.
   */
  let {
    shape,
    sides,
    face,
    label,
    dropped = false,
    tumble = false,
    delay,
    duration,
    turned = 0,
  }: {
    shape: DieShape
    /** What it is (`6`, `3`, `%`, `F`), written on it while it has no face. */
    sides: string
    face: string
    /** Its name for those who can't see it (_d6: 4_). */
    label: string
    dropped?: boolean
    tumble?: boolean
    delay?: number
    duration?: number
    /** How far it's turned on the table (degrees): its light stays above while it turns. */
    turned?: number
  } = $props()

  /** Each shape's outline, in a 40 × 40 box. */
  const OUTLINES: Record<Exclude<DieShape, 6 | 'fudge' | 'coin'>, string> = {
    4: '20,3 37,35 3,35',
    8: '20,2 38,20 20,38 2,20',
    10: '20,2 37,16 20,38 3,16',
    percent: '20,2 37,16 20,38 3,16',
    12: '20,2 38,15 31,37 9,37 2,15',
    20: '20,2 37,11 37,29 20,38 3,29 3,11',
  }
  /** A d4's face sits low, in the triangle's body. */
  const faceY = $derived(shape === 4 ? 25 : 20)
  /** What's written on it: its face, or what it is until it has one. */
  const shown = $derived(face || `d${sides}`)
  /** Its light, one per die drawn. */
  const lit = $props.id()
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
  <defs>
    <linearGradient
      id={lit}
      x1="0"
      y1="0"
      x2="0.6"
      y2="1"
      gradientTransform={turned ? `rotate(${-turned} 0.5 0.5)` : undefined}
    >
      <stop offset="0" class="light" />
      <stop offset="1" class="shade" />
    </linearGradient>
  </defs>
  {#if shape === 6 || shape === 'fudge'}
    <rect x="5" y="5" width="30" height="30" rx="6" fill="url(#{lit})" />
  {:else if shape === 'coin'}
    <circle cx="20" cy="20" r="17" fill="url(#{lit})" />
    <circle class="rim" cx="20" cy="20" r="13" />
  {:else}
    <polygon points={OUTLINES[shape]} fill="url(#{lit})" />
  {/if}
  <text x="20" y={faceY} class:small={shown.length > 2} class:sides={!face}>{shown}</text>
</svg>

<style>
  .die {
    width: var(--die, 22px);
    height: var(--die, 22px);
    flex-shrink: 0;
    overflow: visible;
  }

  .die {
    filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
  }

  .die :is(rect, circle, polygon) {
    stroke: var(--accent);
    stroke-width: var(--die-stroke, 2);
    stroke-linejoin: round;
  }

  /* Lit from above: the top lighter, the bottom the panel's. */
  .light {
    stop-color: color-mix(in srgb, var(--panel), white 22%);
  }

  .shade {
    stop-color: var(--panel);
  }

  .die .rim {
    fill: none;
    stroke-width: 1;
    opacity: 0.5;
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

  /* What it is, before it has a face: quieter than a face. */
  .die text.sides {
    font-weight: 400;
    fill: var(--text-muted);
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
