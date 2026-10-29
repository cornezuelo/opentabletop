<script lang="ts">
  import { SideCount, SideItem, SideList, SideTag, Sidebar } from '@open-tabletop/ui-kit'
  import { OlderPacks } from '@open-tabletop/pack-ui'
  import { systemName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { createSystem } from '../lib/newSystem'
  import { library, systems } from '../lib/packs.svelte'
  import { importSystem, staleCopies } from '../lib/transfer'

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
    go({ name: 'system', id, tab: 'overview' })
  }

  async function importOne() {
    const system = await importSystem()
    if (system) go({ name: 'system', id: system.id, tab: 'overview' })
  }
</script>

<Sidebar title={t('nav.systems')}>
  <SideList>
    {#each systems.list as s (s.id)}
      {@const o = origin(s.id)}
      {@const count = problems(s.id)}
      <SideItem
        name={systemName(s, getLocale())}
        selected={selected === s.id}
        onclick={() => go({ name: 'system', id: s.id, tab: 'overview' })}
      >
        {#if o}<SideTag>{t(`origin.${o}`)}</SideTag>{/if}
        {#if library.bundledChanges(library.rootOf(s.id) ?? '').length}
          <SideTag kind="updated" tip={t('edit.updatedTip')}>{t('origin.updated')}</SideTag>
        {:else if staleCopies(s).length}
          <SideTag kind="updated" tip={t('edit.staleTip')}>{t('origin.updated')}</SideTag>
        {/if}
        {#if library.pack(library.rootOf(s.id) ?? '')?.personal}
          <SideTag kind="personal">{t('origin.personal')}</SideTag>
        {/if}
        {#if count}
          <SideCount {count} tip={t('nav.problems', { count })} />
        {/if}
      </SideItem>
    {/each}
  </SideList>
  <OlderPacks {library} locale={getLocale()} />
  <form
    onsubmit={(e) => {
      e.preventDefault()
      create()
    }}
  >
    <input type="text" placeholder={t('nav.newSystem')} bind:value={name} />
    <button type="submit" class="icon" aria-label={t('nav.newSystem')}>+</button>
  </form>
  <button class="import" onclick={importOne}>{t('nav.import')}</button>
</Sidebar>

<style>
  form {
    display: flex;
    gap: 4px;
  }

  form input {
    flex: 1;
    min-width: 0;
  }

  .import {
    align-self: flex-start;
    padding: 4px 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .import:hover {
    color: var(--text);
  }
</style>
