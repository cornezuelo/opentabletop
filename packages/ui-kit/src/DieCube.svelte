<script lang="ts">
  import { CUBE_FACES, facing, type CubeFace } from './diceThrow'

  /**
   * A die drawn as a solid in 3D (docs/dice.md): a cube (a d6, Fudge, a d3 rolled as a d6)
   * with a face on each side, or a coin (a d2) with one on each side, turned
   * `rotateX(rx) rotateY(ry)` as it rolls; each side lit by how much it looks at the eye, so it
   * reads as a solid turning over. Sized by `--die`, as `DieFace`. `settling` eases it onto the
   * face it rests on.
   */
  let {
    shape,
    faces,
    rx,
    ry,
    settling = false,
    dropped = false,
    label,
  }: {
    shape: 'cube' | 'coin'
    /** What each side shows (a coin: `front` and `back`). */
    faces: Partial<Record<CubeFace, string>>
    rx: number
    ry: number
    settling?: boolean
    dropped?: boolean
    /** Its name for those who can't see it (_d6: 4_). */
    label: string
  } = $props()

  const sides = $derived(shape === 'coin' ? (['front', 'back'] as const) : CUBE_FACES)
  // A coin flips over one axis only.
  const turnY = $derived(shape === 'coin' ? 0 : ry)
  const light = $derived(facing(rx, turnY))
</script>

<span class="solid" class:coin={shape === 'coin'} class:dropped role="img" aria-label={label}>
  <span class="body" class:settling style:transform="rotateX({rx}deg) rotateY({turnY}deg)">
    {#each sides as side (side)}
      <span class="side {side}" style:--shade={Math.max(0, 0.55 * (1 - light[side]))}
        ><span class="mark">{faces[side] ?? ''}</span></span
      >
    {/each}
  </span>
</span>

<style>
  .solid {
    position: relative;
    display: block;
    width: var(--die, 22px);
    height: var(--die, 22px);
    perspective: calc(var(--die, 22px) * 6);
  }

  .body {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }

  .body.settling {
    transition: transform 0.22s cubic-bezier(0.3, 0.7, 0.3, 1);
  }

  .side {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: linear-gradient(160deg, color-mix(in srgb, var(--panel), white 22%), var(--panel));
    border: 2px solid var(--accent);
    border-radius: 16%;
    backface-visibility: hidden;
  }

  /* Its light: darker the more it looks away. */
  .side::after {
    position: absolute;
    inset: 0;
    content: '';
    background: rgb(0 0 0 / var(--shade));
    border-radius: inherit;
  }

  .mark {
    font-family: ui-monospace, monospace;
    font-size: calc(var(--die, 22px) * 0.42);
    font-weight: 700;
    color: var(--text);
  }

  .front {
    transform: translateZ(calc(var(--die, 22px) / 2));
  }

  .back {
    transform: rotateY(180deg) translateZ(calc(var(--die, 22px) / 2));
  }

  .right {
    transform: rotateY(90deg) translateZ(calc(var(--die, 22px) / 2));
  }

  .left {
    transform: rotateY(-90deg) translateZ(calc(var(--die, 22px) / 2));
  }

  .top {
    transform: rotateX(90deg) translateZ(calc(var(--die, 22px) / 2));
  }

  .bottom {
    transform: rotateX(-90deg) translateZ(calc(var(--die, 22px) / 2));
  }

  /* A coin: a disc, its two sides a hair apart. */
  .coin .side {
    border-radius: 50%;
  }

  .coin .front {
    transform: translateZ(1px);
  }

  .coin .back {
    transform: rotateX(180deg) translateZ(1px);
  }

  /* Left out by a keep, as a flat die is. */
  .dropped {
    opacity: 0.4;
  }

  .dropped .side {
    border-color: var(--text-muted);
    border-style: dashed;
  }

  @media (prefers-reduced-motion: reduce) {
    .body.settling {
      transition: none;
    }
  }
</style>
