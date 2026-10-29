<script lang="ts">
  import { roster } from '@open-tabletop/character-ui'
  import { systemName } from '@open-tabletop/session'
  import { appUrl, fullText, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { importCharacters } from '../lib/actions'
  import { getLocale, t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  const selected = $derived(nav.view.name === 'character' ? nav.view.id : undefined)
  let search = $state('')

  /** The roster by system (the one whose characters' sheet each is made with), then the rest. */
  const groups = $derived.by(() => {
    const wanted = search.trim().toLowerCase()
    const out: Record<string, { title: string; ids: { id: string; name: string }[] }> = {}
    for (const { character } of roster.roster.characters) {
      const name = character.name || character.id
      if (wanted && !`${name} ${character.id}`.toLowerCase().includes(wanted)) continue
      const system = systems.ofSheet(character.sheet)
      const key = system?.id ?? ''
      out[key] ??= {
        title: system ? systemName(system, getLocale()) : t('nav.otherSheets'),
        ids: [],
      }
      out[key].ids.push({ id: character.id, name })
    }
    // Systems in the order they're listed, other sheets last.
    const order = (key: string) =>
      key === '' ? Infinity : systems.list.findIndex((s) => s.id === key)
    return Object.entries(out)
      .sort(([a], [b]) => order(a) - order(b))
      .map(([, g]) => g)
  })

  let file: HTMLInputElement
  async function imported(e: Event & { currentTarget: HTMLInputElement }) {
    const chosen = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!chosen) return
    const done = importCharacters(await chosen.text())
    if ('error' in done) showToast(t('imported.broken'), 'error')
    else if (!done.names.length) showToast(t('imported.none'), 'error')
    else showToast(t('imported.some', { names: done.names.join(', ') }))
  }
</script>

<nav class="sidebar">
  <h2>{t('nav.characters')}</h2>
  <div class="buttons">
    <button class="primary" onclick={() => go({ name: 'new' })}>{t('nav.newCharacter')}</button>
    <button use:tooltip={t('nav.importTip')} onclick={() => file.click()}>{t('nav.import')}</button>
    <input
      bind:this={file}
      type="file"
      accept=".json,application/json"
      hidden
      onchange={imported}
    />
  </div>
  {#if roster.roster.characters.length}
    <input
      class="search"
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search}
    />
  {/if}
  {#each groups as group (group.title)}
    <section>
      <h3>{group.title}</h3>
      <ul>
        {#each group.ids as c (c.id)}
          <li>
            <button
              class:selected={selected === c.id}
              onclick={() => go({ name: 'character', id: c.id })}
            >
              <span class="name" use:fullText>{c.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="help">
      {roster.roster.characters.length ? t('nav.noMatch') : t('nav.empty')}
    </p>
  {/each}
  <button class="link" onclick={() => go({ name: 'bestiary' })}>{t('nav.bestiary')}</button>
  <a class="make" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 10px calc(10px + var(--scroll-room)) 10px 10px;
    overflow: auto;
    scrollbar-gutter: stable;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  h2 {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  h3 {
    margin: 0 0 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .buttons button {
    flex: 1 1 auto;
    white-space: nowrap;
    padding: 5px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons .primary {
    color: var(--accent);
    border-color: var(--accent);
  }

  .search {
    width: 100%;
    box-sizing: border-box;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li button {
    display: flex;
    gap: 6px;
    align-items: center;
    width: 100%;
    padding: 5px 6px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  li button:hover,
  li button.selected {
    background: rgb(200 162 74 / 0.12);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .make,
  .link {
    font-size: 13px;
    color: var(--accent);
  }

  .link {
    padding: 0;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
