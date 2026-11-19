<script lang="ts">
  import {
    drawRoll,
    ROLL_MS,
    ROLL_STAGGER_MS,
    rollingFace,
    type DrawnDie,
    type DrawnRoll,
    type TrayRoll,
  } from './diceTray'
  import { dicePreferences } from './dicePreferences.svelte'
  import DieFace from './DieFace.svelte'

  /**
   * The dice of one or more rolls, each die drawn as its shape with its face (d4 to d20, d%,
   * Fudge, d66 as two d6): those a keep left out faded, exploding ones chained, then what's
   * added and the total; the totals a roll mode didn't keep, small and faded; a roll made by
   * hand marked so, its one die drawn showing its total when it's a single die. The rolls made
   * inside the result another one came to (`inside`: a row's harm) come after those asked
   * for, smaller, said so (_in the result_), so a 1d6 never reads as two dice. `large` for a
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
    rolls: readonly TrayRoll[]
    locale?: string
    large?: boolean
    animate?: boolean
  } = $props()

  const TEXT = {
    en: {
      byHand: 'your roll',
      notKept: 'not kept',
      die: 'd{sides}: {face}',
      inside: 'in the result',
    },
    es: {
      byHand: 'tu tirada',
      notKept: 'no se queda',
      die: 'd{sides}: {face}',
      inside: 'en el resultado',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)
  const drawn = $derived(rolls.filter((r) => !r.inside).map((r) => drawRoll(r)))
  const within = $derived(rolls.filter((r) => r.inside).map((r) => drawRoll(r)))
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  // A roll the player made themselves (thrown on screen or typed) has rolled already: it never
  // tumbles again.
  const tumbles = $derived(
    animate && dicePreferences.animate && !reduced && !rolls.every((r) => r.byHand),
  )
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
  const shown = (d: DrawnDie, face: string) =>
    rolling ? (void tick, rollingFace(d, Math.random())) : face
</script>

{#snippet die(d: DrawnDie, face: string, i: number)}
  <DieFace
    shape={d.shape}
    sides={d.sides}
    face={shown(d, face)}
    dropped={d.dropped}
    tumble={tumbles}
    delay={i * ROLL_STAGGER_MS}
    duration={ROLL_MS}
    label={text.die.replace('{sides}', d.sides).replace('{face}', face || '0')}
  />
{/snippet}

{#snippet roll(r: DrawnRoll, kept: boolean)}
  <span class="roll" class:other={!kept}>
    {#if r.byHand}
      <span class="hand">{text.byHand}</span>
    {/if}
    {#if r.parts.length}
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
  {#if within.length}
    <span class="inside">
      <span class="hand">{text.inside}</span>
      {#each within as r, i (i)}{@render roll(r, true)}{/each}
    </span>
  {/if}
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

  .chain.exploded {
    --die-stroke: 3;
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
    font-size: 11px;
    font-style: italic;
    color: var(--text-muted);
  }

  /* What the result rolled inside it (a row's harm): after the roll asked for, smaller. */
  .inside {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 3px 10px;
    align-items: center;
    --die: 18px;
  }

  .large .inside {
    --die: 26px;
  }

  .large .inside .total {
    font-size: 15px;
  }

  /* What a roll mode didn't keep: small and faded. */
  .not-kept {
    --die: 16px;
    opacity: 0.5;
  }

  .large .not-kept {
    --die: 24px;
  }

  .total.waiting {
    opacity: 0.5;
  }
</style>
