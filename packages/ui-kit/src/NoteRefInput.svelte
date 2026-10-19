<script lang="ts">
  import { noteProviderName, noteUrl } from './notes.svelte'
  import { tooltip } from './tooltip'

  /** A link to a note in the player's notes app (its path), with ↗ to open it there. */
  let {
    value,
    placeholder,
    label,
    locale,
    onchange,
  }: {
    value: string
    placeholder: string
    label: string
    locale: string
    onchange: (value: string) => void
  } = $props()

  const TEXT = {
    en: {
      open: 'Open in {provider}',
      notConfigured: 'Set up {provider} in Preferences (⚙ at the top)',
    },
    es: {
      open: 'Abrir en {provider}',
      notConfigured: 'Configura {provider} en Preferencias (⚙ arriba)',
    },
  }
  const t = (key: 'open' | 'notConfigured', provider: string) =>
    (TEXT[locale as 'en' | 'es'] ?? TEXT.en)[key].replace('{provider}', provider)

  const providerName = $derived(noteProviderName())
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
      use:tooltip={t('open', providerName)}
      aria-label={t('open', providerName)}>↗</a
    >
  {/if}
</div>
{#if value && !url}
  <small>{t('notConfigured', providerName)}</small>
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
