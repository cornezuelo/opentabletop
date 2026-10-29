<script lang="ts">
  import { roster } from '@open-tabletop/character-ui'
  import { systemName } from '@open-tabletop/session'
  import {
    appUrl,
    showToast,
    SideButtons,
    SideItem,
    SideList,
    Sidebar,
    tooltip,
  } from '@open-tabletop/ui-kit'
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

<Sidebar title={t('nav.characters')}>
  <SideButtons>
    <button class="primary" onclick={() => go({ name: 'new' })}>{t('nav.newCharacter')}</button>
    <button use:tooltip={t('nav.importTip')} onclick={() => file.click()}>{t('nav.import')}</button>
    <input
      bind:this={file}
      type="file"
      accept=".json,application/json"
      hidden
      onchange={imported}
    />
  </SideButtons>
  {#if roster.roster.characters.length}
    <input
      class="side-search"
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search}
    />
  {/if}
  {#each groups as group (group.title)}
    <section>
      <h3>{group.title}</h3>
      <SideList>
        {#each group.ids as c (c.id)}
          <SideItem
            name={c.name}
            selected={selected === c.id}
            onclick={() => go({ name: 'character', id: c.id })}
          />
        {/each}
      </SideList>
    </section>
  {:else}
    <p class="side-help">
      {roster.roster.characters.length ? t('nav.noMatch') : t('nav.empty')}
    </p>
  {/each}
  <button class="side-link" onclick={() => go({ name: 'bestiary' })}>{t('nav.bestiary')}</button>
  <a class="side-link" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</Sidebar>

<style>
  h3 {
    margin: 0 0 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }
</style>
