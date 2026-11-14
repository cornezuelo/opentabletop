<script lang="ts">
  import { tick, type Snippet } from 'svelte'
  import type { CharacterState, Sheet } from '@open-tabletop/character-engine'
  import type { Fighter } from '@open-tabletop/session'
  import { CharacterGlance } from '@open-tabletop/character-ui'
  import { DiceTray, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import BeatView from './BeatView.svelte'
  import type { BeatTold } from './beats'
  import { translator } from './i18n'
  import type { CardAction, TurnTold } from './turns'

  /**
   * A fight in turns as a stage (docs/fight-stage.md), as any host shows it (session's
   * `encounterView`), filling whatever holds it: on top the round and whose turn; the foes'
   * cards across the table, the party's near the player, the turn between them; the whole
   * fight's log in a column at the right. Everyone is a card in the order of play (each one's main
   * value, as its sheet draws it, what just happened to it and its conditions; who acts now
   * large, who has acted faded, who is gone struck through), and **End the fight** by hand.
   * On a turn of the party's, what's done to a foe is on its card (`cardActions`, `onact`),
   * the rest in the turn's bar (`turnBar`, the host's buttons); when a step still asks whom
   * (`asking`), the panel says so and the cards that can be chosen are what's clicked
   * (`targets`, `ontarget`). The turn just played is told up front in one sentence, its dice
   * rolling (`last`). The fight's moments, oldest first, scroll at the right (`log`).
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
    log = [],
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
    last,
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
    /** The fight's moments, oldest first. */
    log?: BeatTold[]
    /** A foe's turn done, the fight waiting for Next: who acts next (its id). */
    next?: string
    /** Goes on to the next turn. */
    onnext?: () => void
    /** One of `targets` chosen. */
    ontarget?: (id: string) => void
    /** Ends the fight by hand (absent: it can't be). */
    onend?: () => void
    /** What's done to a foe on a turn of the party's, on the foes' cards. */
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
    /** The turn just played, told in one sentence. */
    last?: TurnTold
    /** Whatever else the trip waits for meanwhile (a question, a share), in the centre. */
    asks?: Snippet
    /** Puts the stage away for a while, the trip (or map) behind it in sight. */
    onhide?: () => void
  } = $props()

  const t = translator(() => locale)
  /** The log's moments folded or opened by hand, by id: the newest open until then. */
  let unfolded = $state<Record<string, boolean>>({})
  const acting = $derived(fighters.find((f) => f.acting))
  /** One's name; the party played as a whole, nameless, is _the party_ (its side said already). */
  const nameOf = (f: Fighter) => f.name || t('fight.theParty')
  const wholeParty = (f: Fighter) => !f.name && f.side === 'party'
  /** The sides, foes across the table, the party near the player; the turn between them. */
  const SIDES = ['foes', 'party'] as const
  /** The log, kept scrolled to its newest moment as moments come. */
  let logEl = $state<HTMLOListElement | undefined>()
  $effect(() => {
    void log.length
    void tick().then(() => logEl?.scrollTo({ top: logEl.scrollHeight }))
  })
</script>

<section class="fight" aria-label={t('fight.title', { round })}>
  <!-- One line on top: the round and whose turn; the fight's settings small at its end. -->
  <header>
    <h3>
      {t('fight.round', { round })}{#if acting}<span class="whose"
          >· {wholeParty(acting)
            ? t('fight.partyWhose')
            : t('fight.whose', { name: nameOf(acting) })}</span
        >{/if}<InfoTip markdown={t('fight.help')} />
    </h3>
    <div class="tools">
      {@render tools?.()}
      {#if onend}
        <button use:tooltip={held || t('fight.endTip')} disabled={!!held} onclick={onend}
          >{t('fight.end')}</button
        >
      {/if}
      {#if onhide}
        <button use:tooltip={t('fight.hideTip')} onclick={onhide}>{t('fight.hide')}</button>
      {/if}
    </div>
  </header>
  <div class="body">
    <div class="table">
      {#each SIDES as side (side)}
        {#if side === 'party'}
          <!-- The centre of the table: the turn, what's rolled and why, what it did. -->
          <div class="centre">
            {#if last}
              {#key last.id}
                <div class="last" class:foes={last.side === 'foes'} aria-live="polite">
                  <p class="said">
                    <!-- Said once: the system's own words often name who already. -->
                    {#if last.who && !last.what.includes(last.who)}<strong>{last.who}</strong>{/if}
                    <span>{last.what}</span>{#if last.on}<span class="on">→ {last.on}</span>{/if}
                  </p>
                  {#if last.dice.length}<DiceTray rolls={last.dice} {locale} large animate />{/if}
                  {#if last.results.length}
                    <ul class="results">
                      {#each last.results as r, i (i)}<li>{r}</li>{/each}
                    </ul>
                  {:else}
                    <p class="hint">{t('fight.noChange')}</p>
                  {/if}
                </div>
              {/key}
            {/if}
            {@render roll?.()}
            {@render asks?.()}
            {#if next !== undefined && onnext}
              {@const done = fighters.findLast((f) => f.done && f.side === 'foes')}
              {@const up = fighters.find((f) => f.id === next)}
              <div class="next">
                <p class="turn">
                  {t('fight.shown', {
                    name: done ? nameOf(done) : '',
                    next: up ? nameOf(up) : '',
                  })}
                </p>
                <button class="button primary" onclick={onnext}>{t('fight.next')}</button>
              </div>
            {:else if asking}
              <p class="turn asking">{asking}</p>
            {:else if acting}
              <p class="turn" class:yours={choosing}>
                {choosing
                  ? wholeParty(acting)
                    ? t(cardActions.length ? 'fight.partyTurnCards' : 'fight.partyTurn')
                    : t(cardActions.length ? 'fight.yourTurnCards' : 'fight.yourTurn', {
                        name: nameOf(acting),
                      })
                  : wholeParty(acting)
                    ? t('fight.partyTurnNow')
                    : t('fight.theirTurn', { name: nameOf(acting) })}
              </p>
              {#if choosing && turnBar}<div class="bar">{@render turnBar()}</div>{/if}
            {/if}
          </div>
        {/if}
        {#if fighters.some((f) => f.side === side)}
          <ol class={`order ${side}`} aria-label={t(`fight.${side}Side`)}>
            {#each fighters as f, i (`${f.id}|${i}`)}
              {#if f.side === side}
                {@const target = targets.includes(f.id) && !!ontarget}
                {@const own =
                  choosing && !asking && !f.gone && onact
                    ? cardActions.filter((a) => a.foes.includes(f.id))
                    : []}
                <li
                  class="fighter"
                  class:acting={f.acting}
                  class:done={f.done}
                  class:gone={f.gone}
                  class:target
                  aria-current={f.acting ? 'step' : undefined}
                  use:tooltip={f.gone ? t('fight.gone') : f.done ? t('fight.acted') : ''}
                >
                  {#snippet card()}
                    <span class="place">{i + 1}</span>
                    {#if f.character}
                      <CharacterGlance
                        sheet={sheetOf(f.character)}
                        character={f.character}
                        {locale}
                        name={nameOf(f)}
                        change={changes[f.id] ?? 0}
                      />
                    {:else}
                      <span class="name">{nameOf(f)}</span>
                    {/if}
                  {/snippet}
                  {#if target}
                    <button
                      class="pick"
                      aria-label={t('fight.choose', { name: nameOf(f) })}
                      onclick={() => ontarget?.(f.id)}>{@render card()}</button
                    >
                  {:else}
                    <div class="pick" class:offered={own.length > 0}>
                      {@render card()}
                      {#if own.length}
                        <!-- What's done to this one: a click takes it on them. -->
                        <span class="card-actions">
                          {#each own as a (a.id)}
                            <button
                              class="button primary"
                              disabled={!!a.disabled}
                              use:tooltip={a.disabled || a.tip || ''}
                              aria-label={t('fight.actOn', { action: a.name, name: nameOf(f) })}
                              onclick={() => onact?.(a.id, f.id)}>{a.name}</button
                            >
                          {/each}
                        </span>
                      {/if}
                    </div>
                  {/if}
                </li>
              {/if}
            {/each}
          </ol>
        {/if}
      {/each}
    </div>
    <!-- The whole fight, every moment from its start, newest at the bottom, scrolling. -->
    <aside class="log-column">
      <h4 class="overline">{t('fight.log')}</h4>
      <ol class="log" aria-label={t('fight.log')} bind:this={logEl}>
        {#each log as told (told.id)}
          <li>
            <BeatView
              {told}
              {locale}
              foldable
              bind:folded={
                () => !(unfolded[told.id] ?? told.id === log.at(-1)?.id),
                (folded) => (unfolded = { ...unfolded, [told.id]: !folded })
              }
            />
          </li>
        {/each}
      </ol>
    </aside>
  </div>
</section>

<style>
  /* The stage fills what holds it: the line on top, the table and the log under it. */
  .fight {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    padding: 12px 16px;
    container-type: inline-size;
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

  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    gap: 16px;
    min-height: 0;
  }

  /* The table: the foes across, the turn in the middle, the party near the player. */
  .table {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 28px;
    min-height: 0;
    overflow-y: auto;
  }

  .order {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fighter {
    width: 190px;
  }

  .centre {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .pick {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
    align-items: start;
    width: 100%;
    height: 100%;
    padding: 8px 10px;
    font: inherit;
    font-size: 13px;
    color: inherit;
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .foes .pick {
    border-style: dashed;
  }

  .place {
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  /* Who acts now: in the accent, lifted. */
  .fighter.acting .pick {
    border: 2px solid var(--accent);
    border-style: solid;
    box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 30%, transparent);
  }

  /* Who has acted, or is gone, faded: the card alone, never what can be done to them now
     (an action on its card, or the card itself when it's one to choose), so nothing that
     can be clicked looks disabled. */
  .fighter.done:not(.target) .pick > :not(.card-actions),
  .fighter.gone:not(.target) .pick > :not(.card-actions) {
    opacity: 0.55;
  }

  .fighter.gone :global(.name) {
    text-decoration: line-through;
  }

  /* One to choose: a button, outlined as it's pointed at. */
  button.pick {
    cursor: pointer;
    outline: 1px dashed var(--accent);
    outline-offset: 1px;
  }

  button.pick:hover,
  button.pick:focus-visible {
    border-color: var(--accent);
    background: var(--bg);
  }

  /* The turn just played, in the middle. */
  .last {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
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

  .results {
    margin: 0;
    padding: 0;
    font-size: 14px;
    font-weight: 600;
    list-style: none;
  }

  .last .hint {
    margin: 0;
  }

  .turn {
    margin: 0;
    font-size: 14px;
    text-align: center;
  }

  .turn.yours,
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

  /* A foe that can be acted on now: its card stands out, its actions on it. */
  .pick.offered {
    border: 2px solid var(--accent);
    border-style: solid;
  }

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    grid-column: 1 / -1;
    gap: 4px;
  }

  /* The turn's other choices: buttons that read as such, never greyed when they can be taken. */
  .bar :global(button:not(:disabled)) {
    padding: 5px 14px;
    font-size: 14px;
    color: var(--accent);
    background: var(--panel);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
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
    gap: 4px;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Narrow: the log under the table, the cards smaller. */
  @container (max-width: 700px) {
    .body {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      overflow-y: auto;
    }

    .table {
      overflow: visible;
    }

    .fighter {
      width: calc(50% - 4px);
    }

    .log-column {
      max-height: 40vh;
      padding: 8px 0 0;
      border-top: 1px solid var(--panel-border);
      border-left: none;
    }
  }
</style>
