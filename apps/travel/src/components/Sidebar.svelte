<script lang="ts">
  import { appUrl, SideItem, SideList, SideTag, Sidebar } from '@open-tabletop/ui-kit'
  import { systemName } from '@open-tabletop/session'
  import { getLocale, t } from '../lib/i18n'
  import { go, nav } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'
  import { OlderPacks } from '@open-tabletop/pack-ui'

  const selected = $derived(nav.view.name === 'system' ? nav.view.id : undefined)

  function origin(id: string) {
    const pack = library.pack(library.rootOf(id) ?? '')
    if (!pack) return null
    return pack.overrides ? 'edited' : pack.origin === 'user' ? 'user' : 'bundled'
  }
</script>

<Sidebar title={t('nav.systems')}>
  <SideList>
    {#each systems.list as s (s.id)}
      {@const o = origin(s.id)}
      <SideItem
        name={systemName(s, getLocale())}
        selected={selected === s.id}
        onclick={() => go({ name: 'system', id: s.id })}
      >
        {#if o}<SideTag>{t(`origin.${o}`)}</SideTag>{/if}
        {#if library.pack(library.rootOf(s.id) ?? '')?.personal}
          <SideTag kind="personal">{t('origin.personal')}</SideTag>
        {/if}
      </SideItem>
    {/each}
  </SideList>
  <OlderPacks {library} locale={getLocale()} />
  <a class="side-link" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</Sidebar>
