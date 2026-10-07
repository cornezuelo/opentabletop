<script lang="ts">
  import { tooltip, confirmAction } from '@open-tabletop/ui-kit'
  import type { HistoryItem } from './roller.svelte'
  import type { OracleUi } from './ui'

  let {
    ui,
    onopen,
    embedded = false,
  }: {
    ui: OracleUi
    /** Called when a past roll is clicked (after showing it in its roll panel). */
    onopen?: (item: HistoryItem) => void
    /** Inside another panel: no own background or border. */
    embedded?: boolean
  } = $props()
  const { t, roller } = $derived(ui)

  function open(item: HistoryItem) {
    roller.show(item)
    onopen?.(item)
  }

  const time = (at: string) =>
    new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
</script>

<aside class="history" class:embedded>
  <header>
    <h2>{t('history.title')}</h2>
    <button
      class="link"
      onclick={async () =>
        (await confirmAction(t('history.confirmClear'))) && roller.clearHistory()}
      >{t('history.clear')}</button
    >
    <button
      class="link"
      use:tooltip={t('history.resetStateTip')}
      onclick={async () => (await confirmAction(t('history.confirmReset'))) && roller.resetState()}
      >{t('history.resetState')}</button
    >
  </header>
  <ol>
    {#each roller.history as item (item.id)}
      <li>
        <button onclick={() => open(item)}>
          <span class="meta">{ui.nameOf(item.source)} · {time(item.at)}</span>
          <span class="text">{item.resolution.text ?? '—'}</span>
        </button>
      </li>
    {:else}
      <li class="empty">{t('history.empty')}</li>
    {/each}
  </ol>
</aside>

<style>
  .history {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px;
    background: var(--panel);
    border-left: 1px solid var(--panel-border);
  }

  .history.embedded {
    padding: 0;
    background: none;
    border: none;
  }

  header {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }

  h2 {
    flex: 1;
    margin: 0 0 8px;
    font-size: 14px;
  }

  ol {
    flex: 1;
    margin: 0;
    padding: 0 var(--scroll-room) 0 0;
    overflow: auto;
    list-style: none;
  }

  li button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 6px 4px;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid var(--panel-border);
    cursor: pointer;
  }

  li button:hover {
    background: rgb(255 255 255 / 0.03);
  }

  .meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .empty {
    color: var(--text-muted);
  }
</style>
