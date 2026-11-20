<script lang="ts">
  import { againstOutcome, type AgainstTarget, type DiceResult } from '@open-tabletop/dice'
  import { againstNeeds, againstVerdict } from './against'
  import { untrack } from 'svelte'
  import DieFace from './DieFace.svelte'
  import { dicePreferences } from './dicePreferences.svelte'
  import { knock } from './diceSound'
  import { portal } from './portal'
  import { settled, startThrow, stepThrow, type Table, type ThrownDie } from './diceThrow'
  import { drawRoll, rollingFace } from './diceTray'

  /**
   * A roll of the player's thrown across a table, large, in the middle of the screen
   * (docs/dice.md): the dice wait in hand; dragged and let go they fly the way the hand moved
   * (a click throws them), bounce off the edges and each other, slowed by the cloth, their
   * faces turning as they go over, and stop on the faces of `rolls` (rolled already: the throw
   * only shows it; several at once, as the Oracle's result rolled them). Then each one's total,
   * large, and **Use it** (`onuse`, the first one's total; `use` names it otherwise). Without tumbling (the
   * player's preference, or the system's reduce motion) they show at once; knocks are heard
   * unless the player turned them off. The dice a roll mode didn't keep (advantage's other)
   * are thrown with the rest and fade as they stop.
   *
   * `inline`, it lives where it's put instead of over the page (a fight's stage,
   * docs/fight-turn.md): only the table, the dice waiting on it for a click or a throw, and
   * its total taken by itself a moment after they stop (no **Use**, nothing to put away).
   *
   * Rolled `against` a number, the table says it from the start (_You need 4 or less_) and,
   * once the dice stop, whether the first roll made it (_Success_, _Failure_).
   */
  let {
    rolls,
    title = '',
    use = '',
    close = '',
    why = [],
    outcome,
    tells = false,
    inline = false,
    against,
    locale = 'en',
    onuse,
    onclose,
  }: {
    /** The rolls, made already: the faces the dice stop on (a total given by hand has none). */
    rolls: readonly Pick<DiceResult, 'expression' | 'terms' | 'total' | 'discarded'>[]
    /** What it's rolled for (_Kael: 1d6 for A blow_). */
    title?: string
    /** What the button that takes it says ('': _Use 4_). */
    use?: string
    /** What the button that puts it away says ('': _Put away_). */
    close?: string
    /** What it's for, under the title, before it's thrown (whom it's on, what came up so far). */
    why?: readonly string[]
    /**
     * What came of it, once used: the host keeps the throw open after **Use** and says what
     * happened (each line), then **Continue** closes it. Undefined while the host plays it.
     */
    outcome?: readonly string[]
    /** Whether the host tells what came of it (`outcome`): **Use** keeps it open till then. */
    tells?: boolean
    /** Lives where it's put (no dialog), its total taken as the dice stop. */
    inline?: boolean
    /** The number the first roll is rolled against: shown, then whether it made it. */
    against?: AgainstTarget
    locale?: string
    /** Its total taken. */
    onuse: (total: number) => void
    /** Put away without it (never asked `inline`). */
    onclose?: () => void
  } = $props()

  const TEXT = {
    en: {
      hint: 'Drag the dice and let go to throw them, or click the table.',
      table: 'The dice table: click it to roll',
      use: 'Use {total}',
      close: 'Put away',
      die: 'd{sides}: {face}',
      rolling: 'Rolling…',
      playing: 'Playing it…',
      continue: 'Continue',
    },
    es: {
      hint: 'Arrastra los dados y suéltalos para lanzarlos, o pulsa la mesa.',
      table: 'La mesa de dados: púlsala para tirar',
      use: 'Usar {total}',
      close: 'Guardar',
      die: 'd{sides}: {face}',
      rolling: 'Rodando…',
      playing: 'Jugándola…',
      continue: 'Continuar',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)

  /**
   * Each die of the rolls, in order, with the face it stops on (an exploding one's each throw);
   * then those of the rolls a roll mode didn't keep, dropped.
   */
  const faces = $derived.by(() => {
    return rolls
      .map((roll) => drawRoll(roll))
      .flatMap((drawn) => [
        ...drawn.parts.map((p) => ({ p, other: false })),
        ...drawn.others.flatMap((o) => o.parts.map((p) => ({ p, other: true }))),
      ])
      .flatMap(({ p, other }) =>
        p.kind === 'dice'
          ? p.dice.flatMap((d) => [
              { shape: d.shape, sides: d.sides, face: d.face, dropped: d.dropped || other },
              ...d.more.map((face) => ({
                shape: d.shape,
                sides: d.sides,
                face,
                dropped: d.dropped || other,
              })),
            ])
          : [],
      )
  })

  /** Whether the first roll made the number it's rolled against, once it's seen. */
  const made = $derived(
    against && rolls[0] ? againstOutcome(against, rolls[0].total).success : undefined,
  )

  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const moves = dicePreferences.animate && !reduced

  // Inline, the dice always wait for the player's hand: the throw is theirs to make.
  let stage = $state<'hand' | 'rolling' | 'done'>(moves || untrack(() => inline) ? 'hand' : 'done')
  /** Inline: the total is taken by itself a moment after the dice stop, once. */
  let taken = false
  $effect(() => {
    if (!inline || stage !== 'done' || taken) return
    const wait = setTimeout(() => {
      taken = true
      onuse(rolls[0]?.total ?? 0)
    }, 700)
    return () => clearTimeout(wait)
  })
  /** Its total used: what came of it shows (`outcome`), with **Continue**. */
  let used = $state(false)
  let table = $state<Table>({ width: 560, height: 320, size: 72 })
  /** Faces shown while they roll: a new one each time a die turns over. */
  let turning = $state<string[]>([])
  let tableEl: HTMLDivElement | undefined = $state()
  let frame = 0

  /** The dice resting in hand, at the table's foot. */
  function inHand(): ThrownDie[] {
    return faces.map((_, i) => ({
      x: table.width / 2 + (i - (faces.length - 1) / 2) * table.size * 1.1,
      y: table.height - table.size * 0.7,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      z: 0,
      vz: 0,
      turns: 0,
      still: true,
    }))
  }
  let dice = $state<ThrownDie[]>(inHand())
  $effect(() => {
    if (!tableEl) return
    const rect = tableEl.getBoundingClientRect()
    if (rect.width > 0)
      table = { width: rect.width, height: rect.height, size: Math.min(72, rect.width / 7) }
    if (stage === 'hand') dice = inHand()
  })

  /** Where the hand was lately, to throw the way it moved. */
  let trail: { x: number; y: number; t: number }[] = []
  const at = (e: PointerEvent) => {
    const rect = tableEl!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
  }
  function down(e: PointerEvent) {
    if (stage !== 'hand') return
    tableEl?.setPointerCapture(e.pointerId)
    trail = [at(e)]
  }
  function move(e: PointerEvent) {
    if (stage !== 'hand' || !trail.length) return
    const p = at(e)
    trail = [...trail.filter((q) => p.t - q.t < 90), p]
    // The dice follow the hand while it holds them.
    dice = inHand().map((d, i) => ({
      ...d,
      x: p.x + (i - (faces.length - 1) / 2) * table.size * 1.1,
      y: p.y,
    }))
  }
  function up(e: PointerEvent) {
    if (stage !== 'hand' || !trail.length) return
    const last = at(e)
    const first = trail[0]!
    const dt = Math.max(0.016, (last.t - first.t) / 1000)
    let velocity = { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
    const speed = Math.hypot(velocity.x, velocity.y)
    trail = []
    // A click, or a hand that barely moved: a throw of its own.
    if (speed < 250) return throwIt()
    const scale = Math.min(1, 2600 / speed) * Math.max(1, 900 / speed)
    velocity = { x: velocity.x * scale, y: velocity.y * scale }
    throwIt(velocity, last)
  }

  function throwIt(velocity?: { x: number; y: number }, from?: { x: number; y: number }) {
    // Without tumbling they show at once.
    if (!moves) {
      stage = 'done'
      return
    }
    dice = startThrow(faces.length, table, Math.random, velocity, from)
    turning = faces.map((f) => rollingFace(f, Math.random()))
    stage = 'rolling'
    let before = performance.now()
    let heard = 0
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - before) / 1000)
      before = now
      const step = stepThrow(dice, table, dt)
      // A face turns each time a die goes over.
      turning = step.dice.map((d, i) =>
        d.turns !== dice[i]!.turns ? rollingFace(faces[i]!, Math.random()) : turning[i]!,
      )
      dice = step.dice
      if (step.knock > 0.08 && dicePreferences.sound && now - heard > 40) {
        knock(step.knock)
        heard = now
      }
      if (settled(dice)) {
        stage = 'done'
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }
  // Put away mid-throw: it stops.
  $effect(() => () => cancelAnimationFrame(frame))

  /** A die's size as drawn: larger while it's in the air. */
  const sizeOf = (d: ThrownDie) => table.size * (1 + d.z / (table.size * 4))
</script>

<!-- Made it or not, beside the total, when it's rolled against a number. -->
{#snippet verdict()}
  {#if made !== undefined}
    <span class="verdict" class:made class:missed={!made}>{againstVerdict(made, locale)}</span>
  {/if}
{/snippet}

{#snippet cloth()}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="table"
    class:inline
    bind:this={tableEl}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    role={inline ? 'button' : 'presentation'}
    tabindex={inline && stage === 'hand' ? 0 : undefined}
    aria-label={inline ? text.table : undefined}
    onkeydown={(e) => {
      if (inline && stage === 'hand' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        throwIt()
      }
    }}
  >
    {#if stage === 'done' && !moves}
      <div class="still">
        {#each faces as f, i (i)}
          <span style:--die="{table.size}px"
            ><DieFace
              shape={f.shape}
              sides={f.sides}
              face={f.face}
              dropped={f.dropped}
              label={text.die.replace('{sides}', f.sides).replace('{face}', f.face)}
            /></span
          >
        {/each}
      </div>
    {:else}
      {#each dice as d, i (i)}
        {@const f = faces[i]!}
        <span
          class="thrown"
          class:held={stage === 'hand'}
          style:--die="{sizeOf(d)}px"
          style:left="{d.x}px"
          style:top="{d.y}px"
          style:transform="translate(-50%, -50%) rotate({d.angle}deg)"
          style:--lift="{Math.min(18, d.z / 6)}px"
        >
          <DieFace
            shape={f.shape}
            sides={f.sides}
            face={stage === 'rolling' ? (turning[i] ?? f.face) : stage === 'hand' ? '' : f.face}
            dropped={stage === 'done' && f.dropped}
            label={text.die.replace('{sides}', f.sides).replace('{face}', f.face)}
          />
        </span>
      {/each}
    {/if}
    {#if against}
      <p
        class="goal"
        class:made={stage === 'done' && made}
        class:missed={stage === 'done' && !made}
      >
        {againstNeeds(against, locale)}
      </p>
    {/if}
    {#if stage === 'hand'}<p class="hint" class:below={against}>{text.hint}</p>{/if}
    {#if inline && stage !== 'hand'}
      <p class="settled" aria-live="polite">
        {#if stage === 'rolling'}<span class="muted">{text.rolling}</span
          >{:else}{#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
            <strong>{roll.total}</strong>{/each}{@render verdict()}{/if}
      </p>
    {/if}
  </div>
{/snippet}

{#if inline}
  {@render cloth()}
{:else}
  <div
    class="throw"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-label={title || rolls[0]?.expression}
  >
    <div class="box">
      {#if title}<p class="title">{title}</p>{/if}
      {#if why.length}
        <ul class="why">
          {#each why as line, i (i)}<li>{line}</li>{/each}
        </ul>
      {/if}
      {@render cloth()}
      <div class="foot">
        {#if used}
          <!-- What came of it, then on. -->
          <div class="outcome" aria-live="polite">
            <p class="total">
              {#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
                <strong>{roll.total}</strong>{/each}{@render verdict()}
            </p>
            {#if outcome}
              <ul>
                {#each outcome as line, i (i)}<li>{line}</li>{/each}
              </ul>
            {:else}
              <p class="total muted">{text.playing}</p>
            {/if}
          </div>
          <button class="button primary" onclick={() => onclose?.()}>{text.continue}</button>
        {:else if stage === 'done'}
          <p class="total">
            {#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
              <strong>{roll.total}</strong>{/each}{@render verdict()}
          </p>
          <button
            class="button primary"
            onclick={() => {
              const total = rolls[0]?.total ?? 0
              if (outcome !== undefined || tells) used = true
              onuse(total)
            }}>{use || text.use.replace('{total}', String(rolls[0]?.total ?? 0))}</button
          >
          <button class="button" onclick={() => onclose?.()}>{close || text.close}</button>
        {:else}
          {#if stage === 'rolling'}<p class="total muted">{text.rolling}</p>{/if}
          <button class="button" onclick={() => onclose?.()}>{close || text.close}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .throw {
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
    width: min(640px, 100%);
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

  /* What it's for, before it's thrown. */
  .why {
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--text-muted);
    font-size: 13px;
  }

  /* What came of it, after: the total, then what happened, large enough to read at a glance. */
  .outcome {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  }

  .outcome ul {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 15px;
  }

  .outcome li + li {
    margin-top: 2px;
  }

  /* The cloth the dice are thrown on. */
  .table {
    position: relative;
    height: min(320px, 50vh);
    overflow: hidden;
    background: radial-gradient(circle at 50% 40%, var(--panel), var(--canvas-bg));
    border: 2px solid var(--panel-border);
    border-radius: 12px;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .table:active {
    cursor: grabbing;
  }

  /* In a stage: lower, the page around it its frame. */
  .table.inline {
    height: min(200px, 28vh);
  }

  .table.inline:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Inline, the total where the dice are, once they stop. */
  .settled {
    position: absolute;
    right: 0;
    bottom: 8px;
    left: 0;
    margin: 0;
    font-size: 16px;
    text-align: center;
    pointer-events: none;
  }

  .settled strong {
    font-size: 24px;
  }

  .thrown {
    position: absolute;
    display: block;
    width: var(--die);
    height: var(--die);
    filter: drop-shadow(var(--lift, 0px) var(--lift, 0px) 4px rgb(0 0 0 / 0.55));
    pointer-events: none;
  }

  .thrown :global(.die) {
    width: 100%;
    height: 100%;
  }

  .thrown :global(.die text:not(.sides)) {
    font-size: 17px;
  }

  .held {
    opacity: 0.9;
  }

  .still {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  /* The number to beat, from the start; once the dice stop, in the colour of how it went. */
  .goal {
    position: absolute;
    top: 10px;
    right: 0;
    left: 0;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--accent);
    text-align: center;
    pointer-events: none;
  }

  .goal.made,
  .verdict.made {
    color: var(--good);
  }

  .goal.missed,
  .verdict.missed {
    color: var(--danger-text);
  }

  .verdict {
    margin-left: 10px;
    font-weight: 700;
  }

  .hint.below {
    top: 38px;
  }

  .hint {
    position: absolute;
    top: 10px;
    right: 0;
    left: 0;
    margin: 0;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
    pointer-events: none;
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  .total {
    margin: 0 auto 0 0;
    font-size: 18px;
  }

  .total strong {
    font-size: 26px;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
