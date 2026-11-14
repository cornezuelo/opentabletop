<script lang="ts">
  import type { DiceResult } from '@open-tabletop/dice'
  import DieFace from './DieFace.svelte'
  import { dicePreferences } from './dicePreferences.svelte'
  import { knock } from './diceSound'
  import { settled, startThrow, stepThrow, type Table, type ThrownDie } from './diceThrow'
  import { drawRoll, rollingFace, type DieShape } from './diceTray'

  /**
   * A roll of the player's thrown across a table, large, in the middle of the screen
   * (docs/dice.md): the dice wait in hand; dragged and let go they fly the way the hand moved
   * (a click throws them), bounce off the edges and each other, slowed by the cloth, their
   * faces turning as they go over, and stop on the faces of `result` (rolled already: the throw
   * only shows it). Then the total, large, and **Use it** (`onuse`). Without tumbling (the
   * player's preference, or the system's reduce motion) they show at once; knocks are heard
   * unless the player turned them off.
   */
  let {
    result,
    title = '',
    locale = 'en',
    onuse,
    onclose,
  }: {
    /** The roll, made already: the faces the dice stop on. */
    result: Pick<DiceResult, 'expression' | 'terms' | 'total' | 'discarded'>
    /** What it's rolled for (_Kael: 1d6 for A blow_). */
    title?: string
    locale?: string
    /** Its total taken. */
    onuse: (total: number) => void
    /** Put away without it. */
    onclose: () => void
  } = $props()

  const TEXT = {
    en: {
      hint: 'Drag the dice and let go to throw them, or click the table.',
      use: 'Use {total}',
      close: 'Put away',
      die: 'd{sides}: {face}',
      rolling: 'Rolling…',
    },
    es: {
      hint: 'Arrastra los dados y suéltalos para lanzarlos, o pulsa la mesa.',
      use: 'Usar {total}',
      close: 'Guardar',
      die: 'd{sides}: {face}',
      rolling: 'Rodando…',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)

  /** Each die of the roll, in order, with the face it stops on (an exploding one's each throw). */
  const faces = $derived.by(() => {
    const drawn = drawRoll(result)
    return drawn.parts.flatMap((p) =>
      p.kind === 'dice'
        ? p.dice.flatMap((d) => [
            { shape: d.shape, face: d.face, dropped: d.dropped },
            ...d.more.map((face) => ({ shape: d.shape, face, dropped: d.dropped })),
          ])
        : [],
    )
  })
  const sidesName = (shape: DieShape) =>
    shape === 'percent' ? '%' : shape === 'fudge' ? 'F' : shape === 'round' ? '' : String(shape)

  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const moves = dicePreferences.animate && !reduced

  let stage = $state<'hand' | 'rolling' | 'done'>(moves ? 'hand' : 'done')
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
    dice = startThrow(faces.length, table, Math.random, velocity, from)
    turning = faces.map((f) => rollingFace(f.shape, Math.random()))
    stage = 'rolling'
    let before = performance.now()
    let heard = 0
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - before) / 1000)
      before = now
      const step = stepThrow(dice, table, dt)
      // A face turns each time a die goes over.
      turning = step.dice.map((d, i) =>
        d.turns !== dice[i]!.turns ? rollingFace(faces[i]!.shape, Math.random()) : turning[i]!,
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

<div class="throw" role="dialog" aria-modal="true" aria-label={title || result.expression}>
  <div class="box">
    {#if title}<p class="title">{title}</p>{/if}
    <div
      class="table"
      bind:this={tableEl}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      role="presentation"
    >
      {#if stage === 'done' && !moves}
        <div class="still">
          {#each faces as f, i (i)}
            <span style:--die="{table.size}px"
              ><DieFace
                shape={f.shape}
                face={f.face}
                dropped={f.dropped}
                label={text.die.replace('{sides}', sidesName(f.shape)).replace('{face}', f.face)}
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
              face={stage === 'rolling' ? (turning[i] ?? f.face) : stage === 'hand' ? '' : f.face}
              dropped={stage === 'done' && f.dropped}
              label={text.die.replace('{sides}', sidesName(f.shape)).replace('{face}', f.face)}
            />
          </span>
        {/each}
      {/if}
      {#if stage === 'hand'}<p class="hint">{text.hint}</p>{/if}
    </div>
    <div class="foot">
      {#if stage === 'done'}
        <p class="total">{result.expression} = <strong>{result.total}</strong></p>
        <button class="button primary" onclick={() => onuse(result.total)}
          >{text.use.replace('{total}', String(result.total))}</button
        >
      {:else if stage === 'rolling'}
        <p class="total muted">{text.rolling}</p>
      {/if}
      <button class="button" onclick={onclose}>{text.close}</button>
    </div>
  </div>
</div>

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

  .thrown :global(.die text) {
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
