<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { CharacterState, Sheet } from '@open-tabletop/character-engine'
  import type { Fighter } from '@open-tabletop/session'
  import { CharacterGlance } from '@open-tabletop/character-ui'
  import { DiceTray, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import BeatView from './BeatView.svelte'
  import type { BeatTold } from './beats'
  import { translator } from './i18n'
  import type { CardAction, TurnTold } from './turns'

  /**
   * A fight in turns, as any host shows it (session's `encounterView`): the round, everyone
   * as a card in the order of play, the party's side and the foes' apart (each one's main
   * value, as its sheet draws it, what just happened to it and its conditions; who acts now
   * large, who has acted faded, who is gone struck through), and **End the fight** by hand.
   * On a turn of the party's, what's done to a foe is on its card (`cardActions`, `onact`),
   * the rest in the turn's bar (`turnBar`, the host's buttons); when a step still asks whom
   * (`asking`), the panel says so and the cards that can be chosen are what's clicked
   * (`targets`, `ontarget`). The turn just played is told up front in one sentence, its dice
   * rolling (`last`). Under it all, the fight's moments, newest first (`log`).
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
    /** The fight's moments, newest first. */
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
  } = $props()

  const t = translator(() => locale)
  /** The log's moments folded or opened by hand, by id: all open until then, and they stay so. */
  let unfolded = $state<Record<string, boolean>>({})
  const acting = $derived(fighters.find((f) => f.acting))
  /** One's name; the party played as a whole, nameless, is _the party_ (its side said already). */
  const nameOf = (f: Fighter) => f.name || t('fight.theParty')
  const wholeParty = (f: Fighter) => !f.name && f.side === 'party'
  /** The sides, apart: the party's first. */
  const SIDES = ['party', 'foes'] as const
</script>

<section class="fight" aria-label={t('fight.title', { round })}>
  <header>
    <h4>{t('fight.title', { round })}<InfoTip markdown={t('fight.help')} /></h4>
    {@render tools?.()}
    {#if onend}
      <button use:tooltip={held || t('fight.endTip')} disabled={!!held} onclick={onend}
        >{t('fight.end')}</button
      >
    {/if}
  </header>
  <!-- The turn just played: who did what to whom, what it left, its dice rolling. -->
  {#if last}
    {#key last.id}
      <div class="last" class:foes={last.side === 'foes'} aria-live="polite">
        <p class="said">
          {#if last.who}<strong>{last.who}</strong>{/if}
          <span>{last.what}</span>{#if last.on}<span class="on">→ {last.on}</span>{/if}
        </p>
        {#if last.dice.length}<DiceTray rolls={last.dice} {locale} large animate />{/if}
        {#if last.results.length}
          <ul class="results">
            {#each last.results as r, i (i)}<li>{r}</li>{/each}
          </ul>
        {/if}
      </div>
    {/key}
  {/if}
  {@render roll?.()}
  {#if next !== undefined && onnext}
    {@const done = fighters.findLast((f) => f.done && f.side === 'foes')}
    {@const up = fighters.find((f) => f.id === next)}
    <div class="next">
      <p class="turn">
        {t('fight.shown', { name: done ? nameOf(done) : '', next: up ? nameOf(up) : '' })}
      </p>
      <button class="primary" onclick={onnext}>{t('fight.next')}</button>
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
  <div class="sides">
    {#each SIDES as side (side)}
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
  {#if log.length}
    <ol class="log" aria-label={t('fight.log')}>
      {#each log as told (told.id)}
        <li>
          <BeatView
            {told}
            {locale}
            foldable
            bind:folded={
              () => !(unfolded[told.id] ?? true),
              (folded) => (unfolded = { ...unfolded, [told.id]: !folded })
            }
          />
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .fight {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    border: 1px solid var(--accent);
    border-radius: 6px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  h4 {
    margin: 0;
  }

  header button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  header button {
    padding: 4px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .sides {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }

  .order {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pick {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
    align-items: start;
    width: 100%;
    padding: 4px 8px;
    font: inherit;
    font-size: 12px;
    color: inherit;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .foes .pick {
    border-style: dashed;
  }

  .place {
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  /* Who acts now: large, in the accent. */
  .fighter.acting .pick {
    padding: 8px 10px;
    font-size: 14px;
    border: 2px solid var(--accent);
    border-style: solid;
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
    background: var(--panel);
  }

  /* The turn just played, up front. */
  .last {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    background: var(--panel);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
  }

  .last.foes {
    border-left-color: var(--danger);
  }

  .said {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
    margin: 0;
    font-size: 14px;
  }

  .on {
    font-weight: 600;
  }

  .results {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }

  .turn.yours,
  .turn.asking {
    font-weight: 600;
    color: var(--accent);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
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

  .log {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
    margin: 0;
    padding: 4px 0 0;
    border-top: 1px solid var(--panel-border);
    list-style: none;
  }

  .turn {
    margin: 0;
    font-size: 13px;
  }

  .next {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
</style>
