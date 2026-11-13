<script lang="ts">
  import type { CharacterState, Sheet } from '@open-tabletop/character-engine'
  import type { Fighter } from '@open-tabletop/session'
  import { CharacterGlance } from '@open-tabletop/character-ui'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import BeatView from './BeatView.svelte'
  import type { BeatTold } from './beats'
  import { translator } from './i18n'

  /**
   * A fight in turns, as any host shows it (session's `encounterView`): the round, everyone
   * as a card in the order of play, the party's side and the foes' apart (each one's main
   * value, as its sheet draws it, what just happened to it and its conditions; who acts now
   * large, who has acted faded, who is gone struck through), and **End the fight** by hand.
   * When what's chosen is one of them (whom to strike), their cards are what's clicked
   * (`targets`, `ontarget`). What the one whose turn it is may do are the host's buttons,
   * under it (a roll of the player's waits under the panel, as the trip's do). Under them, the
   * fight's moments, newest first (`log`).
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
  } = $props()

  const t = translator(() => locale)
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
    {#if onend}
      <button use:tooltip={held || t('fight.endTip')} disabled={!!held} onclick={onend}
        >{t('fight.end')}</button
      >
    {/if}
  </header>
  <div class="sides">
    {#each SIDES as side (side)}
      {#if fighters.some((f) => f.side === side)}
        <ol class={`order ${side}`} aria-label={t(`fight.${side}Side`)}>
          {#each fighters as f, i (`${f.id}|${i}`)}
            {#if f.side === side}
              {@const target = targets.includes(f.id) && !!ontarget}
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
                  <div class="pick">{@render card()}</div>
                {/if}
              </li>
            {/if}
          {/each}
        </ol>
      {/if}
    {/each}
  </div>
  {#if next !== undefined && onnext}
    {@const done = fighters.findLast((f) => f.done && f.side === 'foes')}
    {@const up = fighters.find((f) => f.id === next)}
    <div class="next">
      <p class="turn">
        {t('fight.shown', { name: done ? nameOf(done) : '', next: up ? nameOf(up) : '' })}
      </p>
      <button class="primary" onclick={onnext}>{t('fight.next')}</button>
    </div>
  {:else if acting}
    <p class="turn">
      {choosing
        ? wholeParty(acting)
          ? t('fight.partyTurn')
          : t('fight.yourTurn', { name: nameOf(acting) })
        : wholeParty(acting)
          ? t('fight.partyTurnNow')
          : t('fight.theirTurn', { name: nameOf(acting) })}
    </p>
  {/if}
  {#if log.length}
    <ol class="log" aria-label={t('fight.log')}>
      {#each log as told, i (told.id)}
        <li><BeatView {told} {locale} folded={i > 0} foldable /></li>
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

  .fighter.done,
  .fighter.gone {
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

  .log {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 240px;
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
