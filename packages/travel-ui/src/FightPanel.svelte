<script lang="ts">
  import { tick, type Snippet } from 'svelte'
  import type { CharacterState, Sheet } from '@open-tabletop/character-engine'
  import type { Fighter } from '@open-tabletop/session'
  import { CharacterGlance, Face } from '@open-tabletop/character-ui'
  import { DiceTray, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { CardAction, FightEnd, FightSeat, FightTurn, TurnRoll } from './turns'

  /**
   * A fight in turns as a stage (docs/fight-stage.md, docs/fight-look.md), as any host shows it
   * (session's `encounterView`), filling whatever holds it: on top the round and whose turn,
   * and the round's order as a strip of faces; the foes' band across the table, the party's
   * near the player, the turn between them; the whole fight's log in a column at the right.
   *
   * A side is a colour (the party's the accent, the foes' the danger tone) and a place.
   * Everyone is a card that keeps its place and size to the fight's end (`roster`: one who
   * went stays where they were, dimmed, with how they went). Three marks and no more: who
   * acts (lifted, ringed in their side's colour), who is aimed at (a dashed ring) and who was
   * just changed (the card shakes, the change large on it); who has acted is a check, never a
   * faded card.
   *
   * On a turn of the party's, its choices are one bar under the turn: what's done to a foe
   * (`cardActions`) is armed there and aimed at a foe's card, which is the button (armed
   * already when there's only one, so a blow is one click), the rest are the host's buttons
   * (`turnBar`); when a step still asks whom (`asking`), the cards that can be chosen are
   * what's clicked (`targets`, `ontarget`).
   *
   * Each turn is told in one piece (`turns`, docs/fight-turn.md): in the centre the one being
   * played or just played, who did what to whom, its dice with what they're for (and what a
   * short table could give, the row it fell on lit), then what it left, large, the rest
   * folded; while it waits for a roll of the player's, that roll in its place (`roll`), never
   * a word of what it hasn't done yet. Once over (`ended`), its closing card takes the centre
   * until **Continue**, the cards still on the table as the fight left them.
   */
  let {
    round,
    fighters,
    choosing,
    locale,
    held = '',
    sheetOf = () => undefined,
    changes = {},
    targets = [],
    turns = [],
    roster = [],
    characterOf = () => undefined,
    partyName = '',
    opening = [],
    ended,
    onclose,
    next,
    onnext,
    onend,
    ontarget,
    cardActions = [],
    onact,
    turnBar,
    tools,
    roll,
    asking = '',
    asks,
    onhide,
  }: {
    round: number
    fighters: Fighter[]
    /** Whether it's a turn of the party's: the player chooses what that one does. */
    choosing: boolean
    locale: string
    /** Why it can't be ended now (the trip waits for the player), in words; '' if it can. */
    held?: string
    /** The sheet a character is of (its values drawn as it says). */
    sheetOf?: (c: CharacterState) => Sheet | undefined
    /** What the last step did to each one's main value, by id (`-2`). */
    changes?: Record<string, number>
    /** Those that can be chosen now (whom to strike), by id: their cards are buttons. */
    targets?: readonly string[]
    /** The fight's turns, oldest first, each told in one piece (`tellFight`). */
    turns?: readonly FightTurn[]
    /** Everyone the fight has told of (`tellFight`): who went keeps their card. */
    roster?: readonly FightSeat[]
    /** One still here by id, once the fight is over and `fighters` is empty: their card stays. */
    characterOf?: (id: string) => CharacterState | undefined
    /** The party's name, over its band (_The Company_); '' for _The party_. */
    partyName?: string
    /** What started it, in words, before its first round. */
    opening?: readonly string[]
    /** How it ended, once it has: its closing card shows in place of the turn. */
    ended?: FightEnd
    /** The closing card put away. */
    onclose?: () => void
    /** A foe's turn done, the fight waiting for Next: who acts next (its id). */
    next?: string
    /** Goes on to the next turn. */
    onnext?: () => void
    /** One of `targets` chosen. */
    ontarget?: (id: string) => void
    /** Ends the fight by hand (absent: it can't be). */
    onend?: () => void
    /** What's done to a foe on a turn of the party's: armed in the turn's bar, aimed at a card. */
    cardActions?: readonly CardAction[]
    /** One of `cardActions` taken on a foe. */
    onact?: (action: string, foe: string) => void
    /** The turn's other choices (actions on no foe), the host's buttons. */
    turnBar?: Snippet
    /** Beside the title: the host's settings of the fight (who rolls). */
    tools?: Snippet
    /** A roll of the player's waiting, shown where the turn is (the host's card). */
    roll?: Snippet
    /** What a step asks while it waits for one of `targets` (_Strike: whom?_); '' for none. */
    asking?: string
    /** Whatever else the trip waits for meanwhile (a question, a share), in the centre. */
    asks?: Snippet
    /** Puts the stage away for a while, the trip (or map) behind it in sight. */
    onhide?: () => void
  } = $props()

  const t = translator(() => locale)
  const acting = $derived(fighters.find((f) => f.acting))
  /** One's name; the party played as a whole, nameless, is _the party_ (its side said already). */
  const nameOf = (f: { name: string }) => f.name || t('fight.theParty')
  const wholeParty = (f: Fighter) => !f.name && f.side === 'party'
  /** The turn in the centre: the newest one with something done (taken, rolled or told). */
  const shown = $derived(turns.findLast((turn) => turn.stage !== 'choosing'))
  /** Whether the turn shown is still the one going on: read before Next, or waiting for a roll. */
  const reading = $derived(!!shown && (next !== undefined || shown.stage === 'rolling'))
  /**
   * Whose turn the header says: the one choosing; else the one shown while it's read or
   * waits for a roll (a foe's turn waiting for Next is still that foe's).
   */
  const whose = $derived(
    choosing && acting
      ? wholeParty(acting)
        ? t('fight.partyWhose')
        : t('fight.whose', { name: nameOf(acting) })
      : shown && reading
        ? shown.who
          ? t('fight.whose', { name: shown.who })
          : t('fight.partyWhose')
        : acting
          ? wholeParty(acting)
            ? t('fight.partyWhose')
            : t('fight.whose', { name: nameOf(acting) })
          : '',
  )
  /** Who acts, marked on the table: as the header says it. */
  const actorId = $derived(
    ended
      ? ''
      : choosing && acting
        ? acting.id
        : shown && reading
          ? shown.whoId
          : (acting?.id ?? ''),
  )
  /** Who the turn going on is aimed at: marked until the next turn. */
  const aimedId = $derived(!ended && !choosing && shown && reading ? shown.onId : '')

  /** Someone at the table: a card that keeps its place to the fight's end. */
  interface Seat {
    id: string
    name: string
    side: 'party' | 'foes'
    done: boolean
    gone: boolean
    /** How they went, in few words. */
    went: string
    character?: CharacterState
  }
  /** The places at the table, in the order each was first seen: nobody moves up as one goes. */
  let places: string[] = []
  const seats = $derived.by<Seat[]>(() => {
    const known = new Set([...fighters.map((f) => f.id), ...roster.map((r) => r.id)])
    places = [
      ...places.filter((id) => known.has(id)),
      ...[...known].filter((id) => !places.includes(id)),
    ]
    return places.map((id) => {
      const live = fighters.find((f) => f.id === id)
      const told = roster.find((r) => r.id === id)
      // Out of the order while the fight goes on: gone. Once it's over, whoever was said to go.
      const gone = live ? live.gone : ended ? told?.went !== undefined : true
      const character = live?.character ?? (gone ? undefined : characterOf(id))
      return {
        id,
        name: nameOf({ name: live?.name ?? told?.name ?? '' }),
        side: live?.side ?? told?.side ?? 'foes',
        done: !!live?.done && !gone,
        gone,
        went: gone ? told?.went || t('fight.went') : '',
        ...(character && { character }),
      }
    })
  })

  /** The action on a foe chosen in the turn's bar. */
  let armedId = $state<string | undefined>()
  /** The one armed now: the one chosen, or the only one that can be taken. */
  const armed = $derived.by(() => {
    if (!choosing || asking || !onact) return undefined
    const open = cardActions.filter((a) => !a.disabled)
    return open.find((a) => a.id === armedId) ?? (open.length === 1 ? open[0] : undefined)
  })
  /** The one pointed at in the order: their card is marked. */
  let pointed = $state('')

  /** The log, kept scrolled to its newest moment as moments come. */
  let logEl = $state<HTMLOListElement | undefined>()
  $effect(() => {
    void turns.length
    void turns.at(-1)?.stage
    void tick().then(() => logEl?.scrollTo({ top: logEl.scrollHeight }))
  })
</script>

<!-- A turn with something done: who did what to whom, then its dice and what it left. -->
{#snippet told(turn: FightTurn)}
  {#key turn.id}
    <div class="last" class:foes={turn.side === 'foes'} aria-live="polite">
      <p class="said">
        <!-- Said once: the system's own words often name who already. -->
        {#if turn.who && !turn.what.includes(turn.who)}<strong>{turn.who}</strong>{/if}
        <span>{turn.what}</span>{#if turn.on}<span class="on">→ {turn.on}</span>{/if}
      </p>
      {#if turn.stage === 'told'}
        {#each turn.rolls as r, i (i)}{@render rolled(r)}{/each}
        {#if turn.outcome.length}
          <ul class="outcome">
            {#each turn.outcome as line, i (i)}<li>{line}</li>{/each}
          </ul>
        {:else}
          <p class="hint">{t('fight.noChange')}</p>
        {/if}
        {#if turn.more.length}
          <details class="more">
            <summary>{t('fight.more', { n: turn.more.length })}</summary>
            <ul>
              {#each turn.more as line, i (i)}<li>{line}</li>{/each}
            </ul>
          </details>
        {/if}
      {/if}
    </div>
  {/key}
{/snippet}

<!-- A roll of the turn: what it's for, its dice, and what a short table could give. -->
{#snippet rolled(r: TurnRoll)}
  <div class="rolled">
    <span class="overline">{r.label}</span>
    <DiceTray rolls={r.dice} {locale} large animate />
    {#if r.rows}
      <ol class="ladder" aria-label={t('yourRoll.ladder')}>
        {#each r.rows as row (row.key)}
          <li class:hit={row.key === r.hit}><span class="range">{row.range}</span> {row.text}</li>
        {/each}
      </ol>
    {/if}
  </div>
{/snippet}

<!-- A side's band: its name, then everyone on it, each in the place they've had all along. -->
{#snippet band(side: 'party' | 'foes')}
  {#if seats.some((seat) => seat.side === side)}
    <div class={`band ${side}`}>
      <p class="overline">
        {side === 'foes' ? t('fight.foesBand') : partyName || t('fight.theParty')}
      </p>
      <ol class="order" aria-label={t(`fight.${side}Side`)}>
        {#each seats as seat (seat.id)}
          {#if seat.side === side}
            {@const target = !seat.gone && targets.includes(seat.id) && !!ontarget}
            {@const aim = !target && !seat.gone && !!armed?.foes.includes(seat.id)}
            <li
              class="fighter"
              class:acting={seat.id === actorId}
              class:aimed={seat.id === aimedId}
              class:hit={!!changes[seat.id]}
              class:gone={seat.gone}
              class:pointed={seat.id === pointed}
              aria-current={seat.id === actorId ? 'step' : undefined}
            >
              {#snippet card()}
                <Face name={seat.name} />
                <span class="who">
                  {#if seat.character}
                    <CharacterGlance
                      sheet={sheetOf(seat.character)}
                      character={seat.character}
                      {locale}
                      name={seat.name}
                      change={changes[seat.id] ?? 0}
                    />
                  {:else}
                    <span class="name">{seat.name}</span>
                  {/if}
                  {#if seat.went}<span class="went">{seat.went}</span>{/if}
                </span>
                {#if seat.done}
                  <span class="check" use:tooltip={t('fight.acted')} aria-label={t('fight.acted')}
                    >✓</span
                  >
                {/if}
              {/snippet}
              {#if target}
                <button
                  class="pick"
                  aria-label={t('fight.choose', { name: seat.name })}
                  onclick={() => ontarget?.(seat.id)}>{@render card()}</button
                >
              {:else if aim && armed}
                <!-- The armed action, aimed: the card is the button. -->
                <button
                  class="pick"
                  aria-label={t('fight.actOn', { action: armed.name, name: seat.name })}
                  onclick={() => onact?.(armed.id, seat.id)}>{@render card()}</button
                >
              {:else}
                <div class="pick">{@render card()}</div>
              {/if}
            </li>
          {/if}
        {/each}
      </ol>
    </div>
  {/if}
{/snippet}

<section class="fight" aria-label={t('fight.title', { round })}>
  <!-- One line on top: the round and whose turn; the fight's settings small at its end. -->
  <header>
    <h3>
      {ended ? t('fight.over') : t('fight.round', { round })}{#if whose && !ended}<span
          class="whose">· {whose}</span
        >{/if}<InfoTip markdown={t('fight.help')} />
    </h3>
    <div class="tools">
      {@render tools?.()}
      {#if onend && !ended}
        <button use:tooltip={held || t('fight.endTip')} disabled={!!held} onclick={onend}
          >{t('fight.end')}</button
        >
      {/if}
      {#if onhide}
        <button use:tooltip={t('fight.hideTip')} onclick={onhide}>{t('fight.hide')}</button>
      {/if}
    </div>
  </header>
  {#if fighters.length && !ended}
    <!-- The round's order: who acts ringed, who has acted checked, who went struck. -->
    <ol class="strip" aria-label={t('fight.order')}>
      {#each fighters as f, i (`${f.id}|${i}`)}
        <li
          class={f.side}
          class:acting={f.id === actorId}
          class:done={f.done && !f.gone}
          class:gone={f.gone}
          use:tooltip={nameOf(f)}
          onpointerenter={() => (pointed = f.id)}
          onpointerleave={() => (pointed = '')}
        >
          <Face name={nameOf(f)} />
          <span class="sr">{nameOf(f)}</span>
        </li>
      {/each}
    </ol>
  {/if}
  <div class="body">
    <div class="table">
      {@render band('foes')}
      <!-- The centre of the table: the turn, what's rolled and why, what it did. -->
      <div class="centre" class:ending={!!ended} class:alone={!shown}>
        {#if ended}
          <!-- Over: its last turn first (the blow that ended it is read here, not skipped),
               then how it ended, who went, what its end did. -->
          {#if shown}{@render told(shown)}{/if}
          <div class="closing" aria-live="polite">
            <h4>{t('fight.overIn', { rounds: ended.rounds })}</h4>
            {#if ended.gone.length}
              <ul class="outcome">
                {#each ended.gone as line, i (i)}<li>{line}</li>{/each}
              </ul>
            {/if}
            {#if ended.left.length}
              <p class="overline">{t('fight.leftTitle')}</p>
              <ul>
                {#each ended.left as line, i (i)}<li>{line}</li>{/each}
              </ul>
            {/if}
            {#if ended.lines.length}
              <p class="overline">{t('fight.endTitle')}</p>
              <ul>
                {#each ended.lines as line, i (i)}<li>{line}</li>{/each}
              </ul>
            {/if}
            {#if onclose}
              <button class="button primary" onclick={onclose}>{t('fight.close')}</button>
            {/if}
          </div>
        {:else}
          {#if shown}{@render told(shown)}{/if}
          {@render roll?.()}
          {@render asks?.()}
          {#if next !== undefined && onnext}
            {@const up = fighters.find((f) => f.id === next)}
            <div class="next">
              <button class="button primary" onclick={onnext}
                >{up ? t('fight.nextIs', { next: nameOf(up) }) : t('fight.next')}</button
              >
            </div>
          {:else if asking}
            <p class="turn asking">{asking}</p>
          {:else if choosing}
            <!-- The turn's choices, each once: what's done to a foe is armed here and aimed
                 at a card; the rest are taken here. -->
            {#if cardActions.length || turnBar}
              <div class="bar">
                {#each onact ? cardActions : [] as a (a.id)}
                  <button
                    class="arm"
                    aria-pressed={armed?.id === a.id}
                    disabled={!!a.disabled}
                    use:tooltip={a.disabled || a.tip || ''}
                    onclick={() => (armedId = a.id)}>{a.name}</button
                  >
                {/each}
                {@render turnBar?.()}
              </div>
            {/if}
          {:else if acting && shown?.stage !== 'rolling'}
            <p class="turn">
              {wholeParty(acting)
                ? t('fight.partyTurnNow')
                : t('fight.theirTurn', { name: nameOf(acting) })}
            </p>
          {/if}
        {/if}
      </div>
      {@render band('party')}
    </div>
    <!-- The whole fight, every moment from its start, newest at the bottom, scrolling. -->
    <aside class="log-column">
      <h4 class="overline">{t('fight.log')}</h4>
      <ol class="log" aria-label={t('fight.log')} bind:this={logEl}>
        {#if opening.length}
          <li class="told">
            {#each opening as line, i (i)}<p class="rest">{line}</p>{/each}
          </li>
        {/if}
        {#each turns as turn, i (turn.id)}
          {#if turn.round !== turns[i - 1]?.round}
            <li class="overline round">{t('fight.round', { round: turn.round })}</li>
          {/if}
          {#each turn.before as line, j (j)}<li class="told"><p class="rest">{line}</p></li>{/each}
          {#if turn.stage !== 'choosing'}
            <li class="told" class:foes={turn.side === 'foes'} class:now={turn.id === shown?.id}>
              <p class="line">
                {#if turn.who && !turn.what.includes(turn.who)}<strong>{turn.who}</strong>{/if}
                {turn.what}{#if turn.on}<span>&nbsp;→ {turn.on}</span>{/if}
              </p>
              {#each turn.rolls as r, j (j)}
                <!-- Its dice small, what they were for in their tooltip. -->
                <p class="dice" use:tooltip={r.label}><DiceTray rolls={r.dice} {locale} /></p>
              {/each}
              {#each turn.outcome as line, j (j)}<p class="left">{line}</p>{/each}
              {#if turn.more.length}
                <details class="more">
                  <summary>{t('fight.more', { n: turn.more.length })}</summary>
                  {#each turn.more as line, j (j)}<p class="rest">{line}</p>{/each}
                </details>
              {/if}
            </li>
          {/if}
        {/each}
        {#if ended}
          <li class="overline round">{t('fight.overIn', { rounds: ended.rounds })}</li>
          {#each ended.lines as line, i (i)}<li class="told"><p class="rest">{line}</p></li>{/each}
        {/if}
      </ol>
    </aside>
  </div>
</section>

<style>
  /* The stage fills what holds it: the line on top, the order, the table and the log. */
  .fight {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    min-height: 0;
    padding: 12px 16px;
    container-type: inline-size;
  }

  /* A side is a colour: the party's the accent, the foes' the danger tone. */
  .party {
    --side: var(--accent);
  }

  .foes {
    --side: var(--danger);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--panel-border);
  }

  h3 {
    margin: 0;
  }

  .whose {
    margin-left: 6px;
    color: var(--accent);
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .tools button {
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .tools button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* The round's order, a face each: who acts larger and ringed, who went struck. */
  .strip {
    display: flex;
    flex: none;
    gap: 8px;
    align-items: center;
    min-height: 36px;
    margin: 0;
    padding: 2px 2px 6px;
    overflow: auto hidden;
    list-style: none;
  }

  .strip li {
    --face: var(--side);
    position: relative;
    display: flex;
    font-size: 11px;
    border-radius: 50%;
    transition: font-size 0.15s;
  }

  .strip li.acting {
    font-size: 14px;
    box-shadow: 0 0 0 2px var(--side);
  }

  .strip li.done::after {
    position: absolute;
    right: -4px;
    bottom: -3px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: var(--side);
    content: '✓';
  }

  .strip li.gone {
    opacity: 0.4;
  }

  .strip li.gone::before {
    position: absolute;
    top: 50%;
    right: -2px;
    left: -2px;
    z-index: 1;
    border-top: 2px solid var(--text-muted);
    content: '';
    transform: rotate(-35deg);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .body {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    gap: 16px;
    min-height: 0;
  }

  /* The table: the foes' band, the turn, the party's band. The bands keep their place and
     the turn takes what's left, scrolling inside itself when it's long. */
  .table {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 12px;
    min-height: 0;
  }

  .band {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    padding: 4px 0;
  }

  .band > .overline {
    margin: 0;
    color: var(--side);
  }

  .order {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fighter {
    flex: 0 1 260px;
    min-width: 200px;
    max-width: 300px;
  }

  .centre {
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: safe center;
    width: 100%;
    max-width: 640px;
    min-height: 0;
    margin: 0 auto;
    overflow-y: auto;
  }

  .centre > :global(*) {
    flex: none;
  }

  /* Over: the blow that ended it and the closing card side by side, both in sight. */
  .centre.ending:not(.alone) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-content: safe center;
    align-items: start;
    max-width: 960px;
  }

  /* A card: always as tall, its side's colour on its top edge, a face, then who it is. */
  .pick {
    --face: var(--side);
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    width: 100%;
    height: 100%;
    min-height: 92px;
    padding: 10px 12px;
    font: inherit;
    font-size: 14px;
    color: inherit;
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-top: 3px solid var(--side);
    border-radius: 8px;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }

  .who {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  /* A name on up to two lines, never cut short while there's room. */
  .who :global(.name),
  .who > .name {
    display: -webkit-box;
    overflow: hidden;
    font-weight: 600;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  /* What just happened to them, large. */
  .who :global(.change) {
    font-size: 18px;
    font-weight: 700;
  }

  /* Who acts: lifted, ringed in their side's colour. */
  .fighter.acting .pick {
    box-shadow:
      0 0 0 2px var(--side),
      0 6px 16px color-mix(in srgb, var(--side) 30%, transparent);
    transform: translateY(-3px);
  }

  /* Who the turn is aimed at, and the one pointed at in the order. */
  .fighter.aimed .pick,
  button.pick:hover,
  button.pick:focus-visible {
    outline: 2px dashed var(--danger);
    outline-offset: 2px;
  }

  .fighter.pointed .pick {
    outline: 1px solid var(--side);
    outline-offset: 2px;
  }

  /* Who was just changed: the card shakes once. */
  .fighter.hit .pick {
    animation: hit 0.4s ease-out;
  }

  @keyframes hit {
    20% {
      transform: translateX(-5px);
    }
    45% {
      transform: translateX(4px);
    }
    70% {
      transform: translateX(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fighter.hit .pick {
      animation: none;
    }

    .pick,
    .strip li {
      transition: none;
    }
  }

  /* One who went: dimmed and struck, still in their place. Nobody else is ever faded. */
  .fighter.gone .pick {
    opacity: 0.5;
  }

  .fighter.gone .name,
  .fighter.gone :global(.name) {
    text-decoration: line-through;
  }

  .went {
    align-self: start;
    padding: 1px 8px;
    font-size: 12px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
  }

  /* Has acted this round: a check, not a faded card. */
  .check {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--side);
  }

  /* One to choose or to aim at: the whole card is the button. */
  button.pick {
    cursor: crosshair;
  }

  /* The turn just played, in the middle. */
  .last {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 14px;
    text-align: center;
    background: var(--panel);
    border-top: 3px solid var(--accent);
    border-radius: 6px;
  }

  .last.foes {
    border-top-color: var(--danger);
  }

  .said {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    align-items: baseline;
    margin: 0;
    font-size: 15px;
  }

  .on {
    font-weight: 600;
  }

  /* What it left, large: the one thing to read. */
  .outcome {
    margin: 0;
    padding: 0;
    font-size: 17px;
    font-weight: 600;
    list-style: none;
  }

  /* A roll of the turn: what it's for over its dice, what it could give under them. */
  .rolled {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .ladder {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 6px;
    margin: 0;
    padding: 0;
    font-size: 12px;
    list-style: none;
  }

  .ladder li {
    padding: 2px 8px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
  }

  .ladder li.hit {
    font-weight: 600;
    color: var(--text);
    border-color: var(--accent);
  }

  .ladder .range {
    font-weight: 600;
  }

  /* Everything else the turn did, folded. */
  .more {
    font-size: 13px;
    color: var(--text-muted);
  }

  .more summary {
    cursor: pointer;
  }

  .more ul {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  }

  /* The fight over: its closing card, where the turn was. */
  .closing {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 16px;
    text-align: center;
    background: var(--panel);
    border-top: 3px solid var(--accent);
    border-radius: 6px;
  }

  .closing h4,
  .closing p {
    margin: 0;
  }

  .closing ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .closing ul:not(.outcome) {
    font-size: 14px;
  }

  .closing button {
    margin-top: 8px;
    padding: 6px 22px;
    font-size: 15px;
    font-weight: 600;
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .last .hint {
    margin: 0;
  }

  .turn {
    margin: 0;
    font-size: 14px;
    text-align: center;
  }

  .turn.asking {
    font-weight: 600;
    color: var(--accent);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    align-items: center;
  }

  /* The turn's choices: buttons that read as such, never greyed when they can be taken. */
  .bar :global(button:not(:disabled)) {
    padding: 5px 14px;
    font-size: 14px;
    color: var(--accent);
    background: var(--panel);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
  }

  .bar .arm:disabled {
    padding: 5px 14px;
    font-size: 14px;
    border-radius: 6px;
  }

  /* The one armed: pressed in. Its foes' cards are what's clicked. */
  .bar .arm[aria-pressed='true'] {
    font-weight: 600;
    color: var(--bg);
    background: var(--accent);
  }

  .next button {
    padding: 6px 22px;
    font-size: 15px;
    font-weight: 600;
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .next {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  /* The fight's whole log, a column of its own. */
  .log-column {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    padding-left: 16px;
    border-left: 1px solid var(--panel-border);
  }

  .log-column h4 {
    margin: 0;
  }

  .log {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    font-size: 13px;
    list-style: none;
  }

  /* A round's title stays on top while its turns scroll. */
  .log .round {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 4px 0 2px;
    background: var(--bg);
  }

  /* A turn: a line of who did what, then what it left; the party's and the foes' told apart. */
  .log .told {
    padding-left: 8px;
    border-left: 3px solid var(--accent);
  }

  .log .told.foes {
    border-left-color: var(--danger);
  }

  .log .told.now {
    background: var(--panel);
  }

  .log p {
    margin: 0;
  }

  .log .left {
    font-weight: 600;
  }

  .log .rest {
    color: var(--text-muted);
  }

  .log .dice {
    width: fit-content;
  }

  /* Narrow: the log under the table, two cards to a row. */
  @container (max-width: 700px) {
    .body {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      overflow-y: auto;
    }

    .table {
      grid-template-rows: auto auto auto;
    }

    .centre,
    .centre.ending:not(.alone) {
      display: flex;
      overflow: visible;
    }

    .fighter {
      flex-basis: calc(50% - 5px);
      min-width: 0;
    }

    .log-column {
      max-height: 40vh;
      padding: 8px 0 0;
      border-top: 1px solid var(--panel-border);
      border-left: none;
    }
  }
</style>
