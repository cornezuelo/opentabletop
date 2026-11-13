<script lang="ts">
  import type { SessionState } from '@open-tabletop/session'
  import type { TripAction } from '@open-tabletop/session'
  import { tooltip } from '@open-tabletop/ui-kit'
  import BeatView from './BeatView.svelte'
  import { tellBeat } from './beats'
  import { beatsSeen } from './beatsSeen.svelte'
  import { translator } from './i18n'
  import type { JournalContext } from './journal'
  import { tripWaits } from './waits'

  /**
   * The important moment the last step ended on (a pause, a fight, a place found, someone
   * falling, a clock filled…), up front until it's put away or the trip goes on. With
   * `onstep`, what the trip waits for goes on from here (**Continue**; a choice is the
   * panel's, `onshow`); without it, the panel below has it. Every important moment waits for
   * **Continue** when the player chose so (`beatsSeen.stop`), else it's put away with ×.
   */
  let {
    session,
    context,
    locale,
    onstep,
    onshow,
  }: {
    session: SessionState
    context: JournalContext
    locale: string
    onstep?: (action: TripAction) => void
    onshow?: () => void
  } = $props()

  const t = translator(() => locale)
  const shown = $derived(beatsSeen.showing(session))
  const told = $derived(shown && tellBeat(shown, context, 'story'))
  const waits = $derived(shown && onstep ? tripWaits(session, context, t) : null)
  const putAway = () => shown && beatsSeen.putAway(session, shown.entries[0]!)
</script>

{#if shown && told}
  <section class="notable" aria-label={t('beats.notable')} role="status">
    <BeatView {told} {locale} big animate />
    <div class="buttons">
      {#if waits?.go && onstep}
        <button
          class="primary"
          onclick={() => {
            putAway()
            onstep(waits.go!)
          }}>{waits.label === 'next' ? t('fight.next') : t('continue')}</button
        >
      {:else if waits && onshow}
        <button class="primary" onclick={onshow}>{t('status.choose')}</button>
      {:else if beatsSeen.stop}
        <button class="primary" onclick={putAway}>{t('continue')}</button>
      {:else}
        <button
          class="close"
          aria-label={t('beats.putAway')}
          use:tooltip={t('beats.putAway')}
          onclick={putAway}>×</button
        >
      {/if}
    </div>
  </section>
{/if}

<style>
  .notable {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--panel);
    border: 1px solid var(--accent);
    border-left-width: 4px;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
  }

  .notable > :global(.beat) {
    flex: 1;
    min-width: 0;
  }

  .buttons {
    display: flex;
    flex-shrink: 0;
    gap: 6px;
  }

  .close {
    padding: 0 6px;
    font-size: 18px;
    line-height: 1;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .close:hover {
    color: var(--accent);
  }
</style>
