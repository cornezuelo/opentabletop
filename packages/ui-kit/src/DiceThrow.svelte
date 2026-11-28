<script lang="ts">
  import { againstOutcome, type AgainstTarget, type DiceResult } from '@open-tabletop/dice'
  import { againstNeeds, againstVerdict } from './against'
  import { untrack } from 'svelte'
  import DieFace from './DieFace.svelte'
  import { dicePreferences } from './dicePreferences.svelte'
  import { knock } from './diceSound'
  import StyledText from './StyledText.svelte'
  import DieCube from './DieCube.svelte'
  import TableDialog from './TableDialog.svelte'
  import {
    playThrow,
    restOf,
    solidFaces,
    solidOf,
    startThrow,
    type CubeFace,
    type Table,
    type ThrowStep,
    type ThrownDie,
  } from './diceThrow'
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
   * `watch`: the computer's roll, thrown by itself to be watched (the Oracle's **Roll**, an
   * important moment of a trip): no hand, the dice fly at once, and a moment after they stop
   * its total is taken (`onuse`); a click on it, or **Skip**, takes it at once.
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
    watch = false,
    against,
    locale = 'en',
    round,
    onagain,
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
    /** The computer's roll, thrown by itself and taken a moment after the dice stop. */
    watch?: boolean
    /** The number the first roll is rolled against: shown, then whether it made it. */
    against?: AgainstTarget
    locale?: string
    /**
     * In a page (with `onagain`): the throw's number; a new one throws `rolls` (made just now)
     * across the cloth, from where the dice lie or where the hand let them go.
     */
    round?: number
    /**
     * In a page, kept between throws (the Oracle's): the dice lie where they fell until the next
     * throw; a click on the cloth, or a throw by the hand, asks the host to roll again (it
     * answers with new `rolls` and `round`); each throw's total is taken (`onuse`) as they stop.
     */
    onagain?: () => void
    /** Its total taken. */
    onuse: (total: number) => void
    /** Put away without it (never asked `inline`). */
    onclose?: () => void
  } = $props()

  const TEXT = {
    en: {
      hint: 'Drag the dice and let go to throw them, or click the table.',
      table: 'The dice table: click it to roll',
      again: 'Click the table to roll, or throw the dice across it.',
      use: 'Use {total}',
      close: 'Put away',
      die: 'd{sides}: {face}',
      rolling: 'Rolling…',
      playing: 'Playing it…',
      continue: 'Continue',
      skip: 'Skip',
    },
    es: {
      hint: 'Arrastra los dados y suéltalos para lanzarlos, o pulsa la mesa.',
      table: 'La mesa de dados: púlsala para tirar',
      again: 'Pulsa la mesa para tirar, o lanza los dados por ella.',
      use: 'Usar {total}',
      close: 'Guardar',
      die: 'd{sides}: {face}',
      rolling: 'Rodando…',
      playing: 'Jugándola…',
      continue: 'Continuar',
      skip: 'Saltar',
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
  /** In a page (the Oracle's), kept between throws: the host rolls again when asked. */
  const page = untrack(() => !!onagain)

  // Inline, the dice always wait for the player's hand: the throw is theirs to make. In a page
  // they lie where they fell until the next one, or wait on the cloth for the first.
  let stage = $state<'hand' | 'rolling' | 'done'>(
    untrack(() => (page ? 'done' : moves || inline ? 'hand' : 'done')),
  )
  /** In a page: whether its dice were thrown yet (a result opened again lies still). */
  let thrownYet = $state(false)
  /** Inline: the total is taken by itself a moment after the dice stop, once. */
  let taken = false
  $effect(() => {
    if (!inline || page || stage !== 'done' || taken) return
    const wait = setTimeout(() => {
      taken = true
      onuse(rolls[0]?.total ?? 0)
    }, 700)
    return () => clearTimeout(wait)
  })
  /** Watched: its total taken a moment after the dice stop (or at once, skipped), once. */
  let watched = false
  function takeWatched() {
    if (watched) return
    watched = true
    onuse(rolls[0]?.total ?? 0)
  }
  $effect(() => {
    if (!watch || stage !== 'done') return
    const wait = setTimeout(takeWatched, 1100)
    return () => clearTimeout(wait)
  })
  /** Its total used: what came of it shows (`outcome`), with **Continue**. */
  let used = $state(false)
  let table = $state<Table>({ width: 560, height: 320, size: 72 })
  /** Faces shown while they roll: a new one each time a die turns over. */
  let turning = $state<string[]>([])
  /** What each side of a solid shows (a cube, a coin), set as it's thrown. */
  let sidesOf = $state<Partial<Record<CubeFace, string>>[]>([])
  /** Where each solid rests once it stops. */
  let rests = $state<{ rx: number; ry: number }[]>([])
  let tableEl: HTMLDivElement | undefined = $state()
  let frame = 0

  const solids = $derived(faces.map((f) => solidOf(f.shape)))

  /** The dice resting in hand, at the table's foot (a page's lie in the middle). */
  function inHand(middle = false): ThrownDie[] {
    return faces.map((_, i) => ({
      x: table.width / 2 + (i - (faces.length - 1) / 2) * table.size * 1.1,
      y: middle ? table.height / 2 : table.height - table.size * 0.7,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      z: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      turns: 0,
      still: true,
    }))
  }
  let dice = $state<ThrownDie[]>(untrack(() => (page ? [] : inHand())))
  /** A result opened again in a page: its dice lie still in the middle, each on its face. */
  function lieStill() {
    dice = inHand(true)
    rests = faces.map(() => ({ rx: 0, ry: 0 }))
    sidesOf = faces.map((f, i) =>
      solids[i] ? solidFaces(solids[i]!, f, rests[i]!, Math.random) : {},
    )
  }
  $effect(() => {
    if (!tableEl) return
    const rect = tableEl.getBoundingClientRect()
    if (rect.width > 0)
      table = { width: rect.width, height: rect.height, size: Math.min(72, rect.width / 7) }
    untrack(() => {
      if (stage === 'hand') dice = inHand()
      else if (page && !thrownYet && stage === 'done') lieStill()
    })
  })
  // Watched: thrown by itself as soon as the table is there.
  let thrownAlone = false
  $effect(() => {
    if (!watch || !tableEl || stage !== 'hand' || thrownAlone) return
    thrownAlone = true
    untrack(() => throwIt())
  })
  /** In a page: the throw the hand asked for, for the roll the host makes of it. */
  let asked: { velocity?: { x: number; y: number }; from?: { x: number; y: number } } = {}
  // In a page, each new round (a roll just made) is thrown, from where the hand let go.
  let lastRound: number | undefined
  $effect(() => {
    const r = round
    if (!page || !tableEl || r === undefined || r === lastRound) return
    lastRound = r
    untrack(() => {
      const { velocity, from } = asked
      asked = {}
      throwIt(velocity, from)
    })
  })

  /** Where the hand was lately, to throw the way it moved. */
  let trail: { x: number; y: number; t: number }[] = []
  /** In a page: the dice picked up from the cloth by the hand. */
  let picked = $state(false)
  const at = (e: PointerEvent) => {
    const rect = tableEl!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
  }
  function down(e: PointerEvent) {
    // Watched: a click on the table takes it at once.
    if (watch) return takeWatched()
    // In a page, a click while they roll stops them where they'll lie.
    if (page && stage === 'rolling') return skip()
    if (stage !== 'hand' && !page) return
    tableEl?.setPointerCapture(e.pointerId)
    trail = [at(e)]
  }
  function move(e: PointerEvent) {
    if (!trail.length || (stage !== 'hand' && !page)) return
    const p = at(e)
    trail = [...trail.filter((q) => p.t - q.t < 90), p]
    if (page && !picked && Math.hypot(p.x - trail[0]!.x, p.y - trail[0]!.y) < 6) return
    picked = page
    // The dice follow the hand while it holds them.
    dice = inHand().map((d, i) => ({
      ...d,
      x: p.x + (i - (faces.length - 1) / 2) * table.size * 1.1,
      y: p.y,
    }))
  }
  function up(e: PointerEvent) {
    if (!trail.length || (stage !== 'hand' && !page)) return
    const last = at(e)
    const first = trail[0]!
    const dt = Math.max(0.016, (last.t - first.t) / 1000)
    let velocity = { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
    const speed = Math.hypot(velocity.x, velocity.y)
    const held = picked
    trail = []
    picked = false
    // A click, or a hand that barely moved: a throw of its own.
    if (speed < 250 || (page && !held)) return thrown()
    const scale = Math.min(1, 2600 / speed) * Math.max(1, 900 / speed)
    velocity = { x: velocity.x * scale, y: velocity.y * scale }
    thrown(velocity, last)
  }
  /** The hand threw: in a page the host rolls again (and the round throws it), else it's thrown. */
  function thrown(velocity?: { x: number; y: number }, from?: { x: number; y: number }) {
    if (!page) return throwIt(velocity, from)
    asked = { velocity, from }
    onagain?.()
  }

  /** The throw being played: every frame of it, made when it leaves the hand. */
  let frames: ThrowStep[] = []
  function throwIt(velocity?: { x: number; y: number }, from?: { x: number; y: number }) {
    cancelAnimationFrame(frame)
    thrownYet = true
    // Without tumbling they show at once.
    if (!moves) {
      stage = 'done'
      if (page) onuse(rolls[0]?.total ?? 0)
      return
    }
    const start = startThrow(faces.length, table, Math.random, velocity, from)
    frames = playThrow(start, table)
    const end = frames.at(-1)?.dice ?? start
    // A solid lands on the face rolled: its sides are written for where it comes to rest.
    rests = end.map((d, i) => (solids[i] ? restOf(solids[i]!, d) : { rx: 0, ry: 0 }))
    sidesOf = faces.map((f, i) =>
      solids[i] ? solidFaces(solids[i]!, f, rests[i]!, Math.random) : {},
    )
    dice = start
    turning = faces.map((f) => rollingFace(f, Math.random()))
    stage = 'rolling'
    const began = performance.now()
    let shown = 0
    let heard = 0
    const tick = (now: number) => {
      const index = Math.min(frames.length - 1, Math.floor(((now - began) / 1000) * 60))
      if (index > shown) {
        const step = frames[index]!
        // A face turns each time a die goes over.
        turning = step.dice.map((d, i) =>
          d.turns !== dice[i]!.turns ? rollingFace(faces[i]!, Math.random()) : turning[i]!,
        )
        const knocked = Math.max(...frames.slice(shown + 1, index + 1).map((f) => f.knock))
        dice = step.dice
        shown = index
        if (knocked > 0.08 && dicePreferences.sound && now - heard > 40) {
          knock(knocked)
          heard = now
        }
      }
      if (shown >= frames.length - 1) return settle()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }
  /** The dice stop: where they lie, each solid on its face. */
  function settle() {
    cancelAnimationFrame(frame)
    const end = frames.at(-1)?.dice
    if (end) dice = end
    stage = 'done'
    if (page) onuse(rolls[0]?.total ?? 0)
  }
  /** Stops a throw at once, the dice where they would have stopped (a key, a click). */
  export function skip() {
    if (stage === 'rolling') settle()
  }
  /** Whether its dice are rolling. */
  export const rolling = () => stage === 'rolling'
  // Put away mid-throw: it stops.
  $effect(() => () => cancelAnimationFrame(frame))

  /** A die's size as drawn: larger while it's in the air. */
  const sizeOf = (d: ThrownDie) => table.size * (1 + d.z / (table.size * 4))
  /** A solid in the hand, before it's thrown: tilted to show it's one. */
  const HELD = { rx: -24, ry: 28 }
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
    class="play-cloth table"
    class:inline
    class:page
    bind:this={tableEl}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    role={inline || page ? 'button' : 'presentation'}
    tabindex={(inline && stage === 'hand') || page ? 0 : undefined}
    aria-label={inline || page ? text.table : undefined}
    onkeydown={(e) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || !(inline || page)) return
      if (page) {
        e.preventDefault()
        e.stopPropagation()
        if (stage === 'rolling') skip()
        else thrown()
      } else if (stage === 'hand') {
        e.preventDefault()
        throwIt()
      }
    }}
  >
    {#if stage === 'done' && !moves && (!page || thrownYet)}
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
        {@const f = faces[i]}
        {#if f}
          {@const solid = solids[i]}
          {@const holding = stage === 'hand' || picked}
          {@const label = text.die.replace('{sides}', f.sides).replace('{face}', f.face)}
          <span
            class="thrown"
            class:held={holding}
            class:solid
            style:--die="{sizeOf(d)}px"
            style:left="{d.x}px"
            style:top="{d.y}px"
            style:transform="translate(-50%, -50%) rotate({d.angle}deg)"
            style:--lift="{Math.min(18, d.z / 6)}px"
          >
            {#if solid}
              <!-- A cube or a coin, turning over in 3D; it rests on the face rolled. -->
              {@const resting = stage === 'done' && !picked}
              <DieCube
                shape={solid}
                faces={holding ? { front: `d${f.sides}` } : (sidesOf[i] ?? { front: f.face })}
                rx={holding ? HELD.rx : resting ? (rests[i]?.rx ?? 0) : d.rx}
                ry={holding ? HELD.ry : resting ? (rests[i]?.ry ?? 0) : d.ry}
                settling={resting}
                dropped={stage === 'done' && f.dropped}
                {label}
              />
            {:else}
              <DieFace
                shape={f.shape}
                sides={f.sides}
                face={stage === 'rolling' ? (turning[i] ?? f.face) : holding ? '' : f.face}
                dropped={stage === 'done' && f.dropped}
                turned={d.angle}
                {label}
              />
            {/if}
          </span>
        {/if}
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
    {#if (stage === 'hand' && !watch) || (page && !thrownYet && !faces.length)}
      <p class="cloth-hint" class:below={against}>{page ? text.again : text.hint}</p>
    {/if}
    {#if inline && !page && stage !== 'hand'}
      <p class="settled" aria-live="polite">
        {#if stage === 'rolling'}<span class="muted">{text.rolling}</span
          >{:else}{#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
            <strong>{roll.total}</strong>{/each}{@render verdict()}{/if}
      </p>
    {/if}
  </div>
{/snippet}

{#if inline || page}
  {@render cloth()}
{:else}
  <TableDialog {title} label={rolls[0]?.expression}>
    {#if why.length}
      <ul class="why">
        {#each why as line, i (i)}<li>{line}</li>{/each}
      </ul>
    {/if}
    {@render cloth()}
    {#snippet foot()}
      {#if used}
        <!-- What came of it, then on. -->
        <div class="outcome" aria-live="polite">
          <p class="total">
            {#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
              <strong>{roll.total}</strong>{/each}{@render verdict()}
          </p>
          {#if outcome}
            <ul>
              {#each outcome as line, i (i)}<li><StyledText text={line} /></li>{/each}
            </ul>
          {:else}
            <p class="total muted">{text.playing}</p>
          {/if}
        </div>
        <button class="button primary" onclick={() => onclose?.()}>{text.continue}</button>
      {:else if watch}
        <!-- Watched: it goes on by itself; a click takes it at once. -->
        {#if stage === 'done'}
          <p class="total">
            {#each rolls as roll, i (i)}{#if i}<span> · </span>{/if}{roll.expression} =
              <strong>{roll.total}</strong>{/each}{@render verdict()}
          </p>
        {:else}
          <p class="total muted">{text.rolling}</p>
        {/if}
        <button class="button" onclick={takeWatched}>{text.skip}</button>
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
    {/snippet}
  </TableDialog>
{/if}

<style>
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

  /* The cloth the dice are thrown on (the theme's `.play-cloth`). */
  .table {
    height: min(320px, 50vh);
    perspective: none;
    cursor: grab;
  }

  /* In a page: as wide as where it lives, its height following its width. */
  .table.page {
    height: auto;
    aspect-ratio: 2.2;
    min-height: 160px;
    max-height: 300px;
    cursor: pointer;
  }

  .table:active {
    cursor: grabbing;
  }

  /* In a stage: lower, the page around it its frame. */
  .table.inline {
    height: min(200px, 28vh);
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

  /* A solid casts its shadow under it: a filter would flatten it. */
  .thrown.solid {
    filter: none;
  }

  .thrown.solid::before {
    position: absolute;
    inset: 8%;
    content: '';
    border-radius: 20%;
    box-shadow: var(--lift, 0px) var(--lift, 0px) 8px 2px rgb(0 0 0 / 0.5);
    translate: 0 4%;
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

  .cloth-hint.below {
    top: 38px;
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
