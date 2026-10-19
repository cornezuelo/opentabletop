<script lang="ts">
  import { appUrl, fullText } from '@open-tabletop/ui-kit'
  import { campaigns } from '../lib/campaign.svelte'
  import { t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'

  /** The campaigns this browser keeps, newest first, with a search box. */
  const selected = $derived(nav.view.name === 'campaign' ? nav.view.id : undefined)
  let search = $state('')

  const shown = $derived.by(() => {
    const wanted = search.trim().toLowerCase()
    return campaigns.list.filter(
      (c) => !wanted || `${c.name} ${c.id}`.toLowerCase().includes(wanted),
    )
  })
</script>

<nav class="sidebar">
  <h2>{t('nav.campaigns')}</h2>
  <div class="buttons">
    <button class="primary" onclick={() => go({ name: 'new' })}>{t('nav.newCampaign')}</button>
  </div>
  {#if campaigns.list.length}
    <input
      class="search"
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search}
    />
  {/if}
  {#if shown.length}
    <ul>
      {#each shown as c (c.id)}
        <li>
          <button
            class:selected={selected === c.id}
            onclick={() => go({ name: 'campaign', id: c.id, tab: 'world' })}
          >
            <span class="name" class:untitled={!c.name} use:fullText
              >{c.name || t('nav.untitled')}</span
            >
          </button>
        </li>
      {/each}
    </ul>
  {:else if campaigns.loaded}
    <p class="help">{campaigns.list.length ? t('nav.noMatch') : t('nav.empty')}</p>
  {/if}
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

  .untitled {
    font-style: italic;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .make {
    font-size: 13px;
    color: var(--accent);
  }
</style>
