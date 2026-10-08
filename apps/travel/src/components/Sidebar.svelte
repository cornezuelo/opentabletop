<script lang="ts">
  import { appUrl, fullText } from '@open-tabletop/ui-kit'
  import { systemName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'

  const selected = $derived(nav.view.name === 'system' ? nav.view.id : undefined)

  function origin(id: string) {
    const pack = library.pack(library.rootOf(id) ?? '')
    if (!pack) return null
    return pack.overrides ? 'edited' : pack.origin === 'user' ? 'user' : 'bundled'
  }
</script>

<nav class="sidebar">
  <h2>{t('nav.systems')}</h2>
  <ul>
    {#each systems.list as s (s.id)}
      {@const o = s.id === 'generic' ? null : origin(s.id)}
      <li>
        <button class:selected={selected === s.id} onclick={() => go({ name: 'system', id: s.id })}>
          <span class="name" use:fullText
            >{s.id === 'generic' ? t('nav.generic') : systemName(s, getLocale())}</span
          >
          {#if s.id === 'generic'}
            <span class="tag">{t('nav.builtIn')}</span>
          {:else if o}
            <span class="tag">{t(`origin.${o}`)}</span>
          {/if}
          {#if library.pack(library.rootOf(s.id) ?? '')?.personal}
            <span class="tag personal">{t('origin.personal')}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
  <a class="make" href={`${appUrl('systems')}#/`}>{t('nav.makeSystems')}</a>
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

  .tag {
    flex: none;
    padding: 0 5px;
    font-size: 10px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .tag.personal {
    color: #d8c58a;
  }

  .make {
    font-size: 13px;
    color: var(--accent);
  }
</style>
