<script lang="ts">
  import type { Snippet } from 'svelte'
  import { getProvider, providers, providerSettings } from '@open-tabletop/note-refs'
  import { notePreferences, setNoteProvider, setNoteSetting } from './notes.svelte'
  import { tooltip } from './tooltip'

  /**
   * A gear in every app's header opening the user's preferences: what every app shares
   * (language, notes app) and, below, the app's own (`children`). All of it is kept in
   * this browser, never in a map, pack or trip.
   */
  let {
    locale,
    locales,
    onlocale,
    title,
    compact = false,
    children,
  }: {
    locale: string
    /** Language code → its name, in that language. */
    locales: Record<string, string>
    onlocale: (locale: string) => void
    /** Heading of the app's own section. */
    title?: string
    compact?: boolean
    children?: Snippet
  } = $props()

  const TEXT = {
    en: {
      button: 'Preferences',
      title: 'Preferences',
      shared: 'Every app',
      sharedHelp: 'Kept in this browser and shared by every OpenTabletop app on this site.',
      language: 'Language',
      notes: 'Notes app',
      notesHelp:
        'Hexes, places and other things can link to a note in your notes app; the link only stores the note’s path, and this turns it into an address.',
      settings: {
        silverbullet: { baseUrl: 'SilverBullet URL' },
        obsidian: { vault: 'Vault name' },
      },
      close: 'Close',
    },
    es: {
      button: 'Preferencias',
      title: 'Preferencias',
      shared: 'Todas las aplicaciones',
      sharedHelp:
        'Se guardan en este navegador y las comparten todas las aplicaciones de OpenTabletop de este sitio.',
      language: 'Idioma',
      notes: 'Aplicación de notas',
      notesHelp:
        'Los hexes, los lugares y otras cosas pueden enlazar con una nota de tu aplicación de notas; el enlace solo guarda la ruta de la nota, y esto la convierte en una dirección.',
      settings: {
        silverbullet: { baseUrl: 'URL de SilverBullet' },
        obsidian: { vault: 'Nombre de la bóveda' },
      },
      close: 'Cerrar',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)
  const provider = $derived(getProvider(notePreferences.provider))
  const values = $derived(providerSettings(provider, notePreferences.settings[provider.id]))
  const settingLabel = (key: string) =>
    (text.settings as Record<string, Record<string, string>>)[provider.id]?.[key] ?? key
  let dialog: HTMLDialogElement
</script>

<button
  class="open"
  class:compact
  aria-label={text.button}
  use:tooltip={text.button}
  onclick={() => dialog.showModal()}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
    />
  </svg>
</button>

<dialog bind:this={dialog} onclick={(e) => e.target === dialog && dialog.close()}>
  <h2>{text.title}</h2>
  <section>
    <h3>{text.shared}</h3>
    <p>{text.sharedHelp}</p>
    <label>
      <span>{text.language}</span>
      <select value={locale} onchange={(e) => onlocale(e.currentTarget.value)}>
        {#each Object.entries(locales) as [code, name] (code)}
          <option value={code}>{name}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>{text.notes}</span>
      <select value={provider.id} onchange={(e) => setNoteProvider(e.currentTarget.value)}>
        {#each providers as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </label>
    {#each provider.settings as setting (provider.id + setting.key)}
      <label>
        <span>{settingLabel(setting.key)}</span>
        <input
          type="text"
          value={values[setting.key]}
          placeholder={setting.placeholder}
          onchange={(e) => setNoteSetting(provider.id, setting.key, e.currentTarget.value.trim())}
        />
      </label>
    {/each}
    <p>{text.notesHelp}</p>
  </section>
  {#if children}
    <section>
      {#if title}<h3>{title}</h3>{/if}
      {@render children()}
    </section>
  {/if}
  <button class="close" onclick={() => dialog.close()}>{text.close}</button>
</dialog>

<style>
  .open {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .open.compact {
    width: 40px;
    height: 40px;
  }

  .open:hover {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  .open svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    fill-rule: evenodd;
  }

  dialog {
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    padding: 18px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  h2 {
    margin: 0 0 12px;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 0;
    border-top: 1px solid var(--panel-border);
  }

  h3 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 15px;
    font-weight: normal;
  }

  section :global(p) {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  section :global(label) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }

  section :global(label.check) {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  section :global(select),
  section :global(input[type='text']) {
    width: 100%;
    padding: 5px 8px;
    font: inherit;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .close {
    float: right;
    padding: 6px 14px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
