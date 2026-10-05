<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte'
  import { getProvider } from '../../lib/notes/providers'
  import type { HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'
  import { noteUrl, preferences } from '../../lib/store/preferences.svelte'

  let { key, note, coord }: { key: HexKey; note: string; coord: string } = $props()

  const providerName = $derived(getProvider(preferences.noteProvider).name)
  const url = $derived(note ? noteUrl(note) : null)
</script>

<div class="field">
  <span>{t('hex.note')}</span>
  <div class="row">
    <input
      type="text"
      value={note}
      placeholder={t('hex.notePlaceholder', { coord })}
      onchange={(e) => editor.editHex(key, (h) => ({ ...h, note: e.currentTarget.value }))}
    />
    {#if url}
      <a
        class="open"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={t('hex.openNote', { provider: providerName })}
        aria-label={t('hex.openNote', { provider: providerName })}>↗</a
      >
    {/if}
  </div>
  {#if note && !url}
    <small>{t('hex.noteNotConfigured', { provider: providerName })}</small>
  {/if}
</div>

<style>
  .row {
    display: flex;
    gap: 4px;
  }

  input {
    flex: 1;
    min-width: 0;
  }

  .open {
    display: grid;
    place-items: center;
    width: 30px;
    color: var(--accent);
    text-decoration: none;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .open:hover {
    border-color: var(--accent);
  }

  small {
    color: var(--text-muted);
  }
</style>
