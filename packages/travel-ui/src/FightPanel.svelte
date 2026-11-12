<script lang="ts">
  import type { Fighter } from '@open-tabletop/session'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  /**
   * A fight in turns, as any host shows it (session's `encounterView`): the round, who acts
   * in order (the party's side and the foes'), whose turn it is, and **End the fight** by
   * hand. What the one whose turn it is may do are the host's buttons, under it.
   */
  let {
    round,
    fighters,
    choosing,
    locale,
    held = '',
    onend,
  }: {
    round: number
    fighters: Fighter[]
    /** Whether it's a turn of the party's: the player chooses what that one does. */
    choosing: boolean
    locale: string
    /** Why it can't be ended now (the trip waits for the player), in words; '' if it can. */
    held?: string
    /** Ends the fight by hand (absent: it can't be). */
    onend?: () => void
  } = $props()

  const t = translator(() => locale)
  const acting = $derived(fighters.find((f) => f.acting))
  /** One's name; the party played as a whole, nameless, is _the party_ (its side said already). */
  const nameOf = (f: Fighter) => f.name || t('fight.theParty')
  const wholeParty = (f: Fighter) => !f.name && f.side === 'party'
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
  <ol class="order" aria-label={t('fight.order')}>
    {#each fighters as f (f.id)}
      <li
        class={f.side}
        class:acting={f.acting}
        class:done={f.done}
        class:gone={f.gone}
        aria-current={f.acting ? 'step' : undefined}
        use:tooltip={f.gone ? t('fight.gone') : f.done ? t('fight.acted') : ''}
      >
        <span class="name">{nameOf(f)}</span>
        {#if !wholeParty(f)}<span class="side">{t(`fight.${f.side}`)}</span>{/if}
      </li>
    {/each}
  </ol>
  {#if acting}
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

  .order {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .order li {
    display: flex;
    gap: 4px;
    align-items: baseline;
    padding: 2px 6px;
    font-size: 12px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .order li.foes {
    border-style: dashed;
  }

  .order li.acting {
    color: var(--accent);
    border-color: var(--accent);
    font-weight: 600;
  }

  .order li.done,
  .order li.gone {
    opacity: 0.55;
  }

  .order li.gone .name {
    text-decoration: line-through;
  }

  .side {
    color: var(--text-muted);
    font-size: 11px;
  }

  .turn {
    margin: 0;
    font-size: 13px;
  }
</style>
