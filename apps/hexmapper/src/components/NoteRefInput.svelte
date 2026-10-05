<script lang="ts">
  import { getProvider } from '@open-tabletop/note-refs'
  import { t } from '../lib/i18n/index.svelte'
  import { noteUrl, preferences } from '../lib/store/preferences.svelte'

  let {
    value,
    placeholder,
    label,
    onchange,
  }: { value: string; placeholder: string; label: string; onchange: (value: string) => void } =
    $props()

  const providerName = $derived(getProvider(preferences.noteProvider).name)
  const url = $derived(value ? noteUrl(value) : null)
</script>

<div class="row">
  <input
    type="text"
    {value}
    {placeholder}
    aria-label={label}
    onchange={(e) => onchange(e.currentTarget.value)}
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
{#if value && !url}
  <small>{t('hex.noteNotConfigured', { provider: providerName })}</small>
{/if}

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
