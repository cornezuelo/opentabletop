<script lang="ts">
  import { noteProviderName, noteUrl, usesOwnNotes, type NoteContext } from './notes.svelte'
  import { tooltip } from './tooltip'

  /**
   * A link to a note in the player's notes app (its path), with ↗ to open it there. With
   * OpenTabletop's Notes, an empty one offers to write the thing's page (`suggest`, its
   * name), made in its campaign and linking back to it (`context`).
   */
  let {
    value,
    placeholder,
    label,
    locale,
    onchange,
    suggest,
    context = {},
  }: {
    value: string
    placeholder: string
    label: string
    locale: string
    onchange: (value: string) => void
    /** The path of a new page for it (the thing's name). */
    suggest?: string
    context?: NoteContext
  } = $props()

  const TEXT = {
    en: {
      write: 'Write its page in {provider}',
      open: 'Open in {provider}',
      notConfigured: 'Set up {provider} in Preferences (⚙ at the top)',
    },
    es: {
      write: 'Escribir su página en {provider}',
      open: 'Abrir en {provider}',
      notConfigured: 'Configura {provider} en Preferencias (⚙ arriba)',
    },
  }
  const t = (key: 'write' | 'open' | 'notConfigured', provider: string) =>
    (TEXT[locale as 'en' | 'es'] ?? TEXT.en)[key].replace('{provider}', provider)

  const providerName = $derived(noteProviderName(locale))
  const url = $derived(value ? noteUrl(value, context) : null)
  const newPage = $derived(
    !value && suggest?.trim() && usesOwnNotes() ? noteUrl(suggest.trim(), context) : null,
  )
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
  {:else if newPage}
    <a
      class="open"
      href={newPage}
      target="_blank"
      rel="noopener noreferrer"
      onclick={() => onchange(suggest!.trim())}
      use:tooltip={t('write', providerName)}
      aria-label={t('write', providerName)}>✎</a
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
