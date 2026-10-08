<script lang="ts">
  import { exampleMaps, exampleSystemName } from '../lib/io/examples'
  import LineIcon from './LineIcon.svelte'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import {
    library,
    listLibrary,
    newMap,
    openLibraryMap,
    openMapFile,
    removeLibraryMap,
    openExampleMap,
  } from '../lib/io/actions.svelte'
  import { formatDeepLink } from '../lib/io/deepLink'
  import { editor } from '../lib/store/editor.svelte'
  import { confirmAction, helpMarkdown, tooltip, showToast } from '@open-tabletop/ui-kit'

  type Entry = Awaited<ReturnType<typeof listLibrary>>[number]
  let entries = $state<Entry[]>([])
  /** The maps the loaded systems bring (`maps:` in their `kind: system`). */
  const examples = $derived(exampleMaps())

  $effect(() => {
    void library.version
    listLibrary().then((list) => (entries = list))
  })

  const date = $derived(
    new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }),
  )

  async function open(id: string) {
    if (await openLibraryMap(id)) editor.panelView = 'tool'
  }

  async function remove(entry: Entry) {
    if (await confirmAction(t('library.confirmDelete', { name: entry.name || t('map.untitled') })))
      await removeLibraryMap(entry.id)
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}${formatDeepLink(id)}`,
      )
      showToast(t('library.linkCopied'))
    } catch {
      // Clipboard unavailable (insecure context).
    }
  }
</script>

<div class="actions">
  <button onclick={() => newMap().then(() => (editor.panelView = 'tool'))}
    >{t('actions.new')}</button
  >
  <button onclick={() => openMapFile().then(() => (editor.panelView = 'tool'))}
    >{t('library.import')}</button
  >
</div>

<p class="help">{t('library.help')}</p>

{#if examples.length}
  <span class="examples-title">{t('library.examples')}</span>
  <ul class="examples">
    {#each examples as example (`${example.pack}/${example.path}`)}
      <li>
        <button
          class="open"
          use:tooltip={{ markdown: helpMarkdown(t('library.exampleHelp')) }}
          onclick={() => openExampleMap(example).then(() => (editor.panelView = 'tool'))}
          ><span class="name">{example.name}</span><span class="meta"
            >{t('library.exampleOf', { system: exampleSystemName(example, getLocale()) })}</span
          ></button
        >
      </li>
    {/each}
  </ul>
  <span class="examples-title">{t('library.yours')}</span>
{/if}

<ul>
  {#each entries as entry (entry.id)}
    <li class:current={entry.id === editor.meta.id}>
      <button class="open" onclick={() => open(entry.id)} disabled={entry.id === editor.meta.id}>
        <span class="name">{entry.name || t('map.untitled')}</span>
        <span class="meta"
          >{entry.id} · {entry.modified ? date.format(new Date(entry.modified)) : ''}</span
        >
      </button>
      <button
        class="icon"
        use:tooltip={t('library.copyLink')}
        aria-label={t('library.copyLink')}
        onclick={() => copyLink(entry.id)}><LineIcon name="link" /></button
      >
      <button
        class="icon danger"
        use:tooltip={t('library.delete')}
        aria-label="{t('library.delete')}: {entry.name || entry.id}"
        onclick={() => remove(entry)}>✕</button
      >
    </li>
  {:else}
    <li class="help">{t('library.empty')}</li>
  {/each}
</ul>

<style>
  .actions {
    display: flex;
    gap: 6px;
  }

  .actions button {
    flex: 1;
    padding: 6px 10px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions button:hover {
    border-color: var(--accent);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: stretch;
    gap: 4px;
  }

  .open {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 6px 8px;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .open:hover:not(:disabled) {
    border-color: var(--text-muted);
  }

  li.current .open {
    border-color: var(--accent);
    cursor: default;
  }

  .name {
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .icon.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .examples-title {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
