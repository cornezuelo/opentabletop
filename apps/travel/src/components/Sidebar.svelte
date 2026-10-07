<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { createSystem } from '../lib/newSystem'
  import { library, systems } from '../lib/packs.svelte'

  let name = $state('')
  const selected = $derived(nav.view.name === 'system' ? nav.view.id : undefined)

  function origin(id: string) {
    const pack = library.pack(library.rootOf(id) ?? '')
    if (!pack) return null
    return pack.overrides ? 'edited' : pack.origin === 'user' ? 'user' : 'bundled'
  }

  function problems(id: string): number {
    const root = library.rootOf(id)
    return root ? library.diagnostics(root).filter((d) => d.severity === 'error').length : 0
  }

  function create() {
    if (!name.trim()) return
    const id = createSystem(name)
    if (!id) return
    name = ''
    go({ name: 'system', id, tab: 'yaml' })
  }
</script>

<nav class="sidebar">
  <h2>{t('nav.systems')}</h2>
  <ul>
    {#each systems.list as s (s.id)}
      {@const o = s.id === 'generic' ? null : origin(s.id)}
      {@const count = s.id === 'generic' ? 0 : problems(s.id)}
      <li>
        <button
          class:selected={selected === s.id}
          onclick={() => go({ name: 'system', id: s.id, tab: 'play' })}
        >
          <span class="name">{s.id === 'generic' ? t('nav.generic') : s.name}</span>
          {#if s.id === 'generic'}
            <span class="tag">{t('nav.builtIn')}</span>
          {:else if o}
            <span class="tag">{t(`origin.${o}`)}</span>
          {/if}
          {#if s.id !== 'generic' && library.bundledChanges(library.rootOf(s.id) ?? '').length}
            <span class="tag updated" use:tooltip={t('edit.updatedTip')}>{t('origin.updated')}</span
            >
          {/if}
          {#if library.pack(library.rootOf(s.id) ?? '')?.personal}
            <span class="tag personal">{t('origin.personal')}</span>
          {/if}
          {#if count}
            <span class="errors" use:tooltip={t('nav.problems', { count })}>{count}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
  <form
    onsubmit={(e) => {
      e.preventDefault()
      create()
    }}
  >
    <input type="text" placeholder={t('nav.newSystem')} bind:value={name} />
    <button type="submit" class="icon" aria-label={t('nav.newSystem')}>+</button>
  </form>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 10px;
    overflow: auto;
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

  .tag.updated {
    color: var(--accent);
    border-color: var(--accent);
  }

  .errors {
    flex: none;
    min-width: 16px;
    padding: 0 4px;
    font-size: 11px;
    color: white;
    text-align: center;
    background: var(--danger);
    border-radius: 8px;
  }

  form {
    display: flex;
    gap: 4px;
  }

  form input {
    flex: 1;
    min-width: 0;
  }
</style>
