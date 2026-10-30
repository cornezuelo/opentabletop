<script lang="ts">
  import { exampleMaps, exampleState, exampleSystemName } from '../lib/io/examples'
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
  import {
    busy,
    confirmAction,
    groupByCampaign,
    helpMarkdown,
    playing,
    tooltip,
    showToast,
  } from '@open-tabletop/ui-kit'
  import { listCampaigns } from '@open-tabletop/storage'
  import { allPlaces } from '@open-tabletop/travel-ui'

  type Entry = Awaited<ReturnType<typeof listLibrary>>[number]
  let entries = $state<Entry[]>([])
  /** The maps the loaded systems bring (`maps:` in their `kind: system`). */
  const examples = $derived(exampleMaps())
  /** Examples that changed since your map of them started (a newer app or pack). */
  const newer = $derived.by(() => {
    void library.version
    void entries
    return new Set(examples.filter((e) => exampleState(e) === 'newer').map((e) => e.id))
  })

  /** The campaign of each map (by its id), and the campaigns' names. */
  let campaignOf = $state<Record<string, string>>({})
  let names = $state<Record<string, string>>({})
  $effect(() => {
    void library.version
    void editor.setup
    listLibrary().then((list) => (entries = list))
    void allPlaces().then(
      (places) =>
        (campaignOf = Object.fromEntries(
          places.filter((p) => p.app === 'hexmapper').map((p) => [p.id, p.campaign]),
        )),
    )
    void listCampaigns()
      .then((list) => (names = Object.fromEntries(list.map((c) => [c.id, c.name]))))
      .catch(() => {})
  })
  /** The maps by campaign: the one being played first. */
  const groups = $derived(
    groupByCampaign(entries, (e) => campaignOf[e.id], names, playing.id, getLocale()),
  )

  const date = $derived(
    new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }),
  )

  /** What's being opened (a map of the library, an example): its button turns. */
  let opening = $state<string | null>(null)

  /** Opens something (`what` names its button), then shows the map's tools if it opened. */
  async function opened(what: string, task: () => Promise<unknown>) {
    if (opening) return
    opening = what
    try {
      if ((await task()) !== false) editor.panelView = 'tool'
    } finally {
      opening = null
    }
  }

  const open = (id: string) => opened(id, () => openLibraryMap(id))

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
          use:tooltip={{
            markdown: helpMarkdown(
              newer.has(example.id)
                ? `${t('library.exampleNewerTip')}\n${t('library.exampleHelp')}`
                : t('library.exampleHelp'),
            ),
          }}
          use:busy={opening === `example:${example.id}`}
          onclick={() => opened(`example:${example.id}`, () => openExampleMap(example))}
          ><span class="name">{example.name}</span><span class="meta"
            >{t('library.exampleOf', { system: exampleSystemName(example, getLocale()) })}</span
          >{#if newer.has(example.id)}<span class="newer">{t('library.exampleNewerTag')}</span
            >{/if}</button
        >
      </li>
    {/each}
  </ul>
  <span class="examples-title">{t('library.yours')}</span>
{/if}

{#each groups as group (group.campaign ?? '')}
  {#if groups.length > 1 || group.campaign}
    <span class="group-title"
      >{group.campaign
        ? group.name
        : t('library.ownCampaigns')}{#if group.campaign === playing.id}<small
          >{` · ${t('library.playing')}`}</small
        >{/if}</span
    >
  {/if}
  <ul>
    {#each group.items as entry (entry.id)}
      <li class:current={entry.id === editor.meta.id}>
        <button
          class="open"
          use:busy={opening === entry.id}
          onclick={() => open(entry.id)}
          disabled={entry.id === editor.meta.id}
        >
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
    {/each}
  </ul>
{:else}
  <p class="help">{t('library.empty')}</p>
{/each}

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

  .newer {
    font-size: 11px;
    color: var(--accent);
  }

  .group-title small {
    font-weight: normal;
    color: var(--text-muted);
  }

  .group-title {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }

  .examples-title {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
