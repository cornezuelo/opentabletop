<script lang="ts">
  import { translator } from './i18n'

  /**
   * Above a long list of folded cards (actions, checks): a search box, how many cards it
   * shows, and buttons to unfold or fold them all.
   */
  let {
    query = $bindable(''),
    shown,
    total,
    label,
    onopenall,
    oncloseall,
    locale,
  }: {
    query?: string
    shown: number
    total: number
    /** What the box searches, for screen readers ("Search the actions"). */
    label: string
    onopenall: () => void
    oncloseall: () => void
    /** The UI language. */
    locale: string
  } = $props()

  const t = translator(() => locale)
</script>

<div class="tools">
  <input type="search" placeholder={t('cards.search')} aria-label={label} bind:value={query} />
  {#if query.trim()}<small>{t('cards.shown', { shown, total })}</small>{/if}
  <span class="fold">
    <button class="link" onclick={onopenall}>{t('cards.openAll')}</button>
    <button class="link" onclick={oncloseall}>{t('cards.closeAll')}</button>
  </span>
</div>
{#if query.trim() && !shown}
  <p class="none">{t('cards.noMatch', { query: query.trim() })}</p>
{/if}

<style>
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    align-items: center;
  }

  input {
    flex: 0 1 18em;
    min-width: 0;
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  .fold {
    display: flex;
    gap: 12px;
    margin-left: auto;
    font-size: 12px;
  }

  .none {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
