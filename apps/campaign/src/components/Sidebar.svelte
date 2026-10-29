<script lang="ts">
  import { appUrl, SideButtons, SideItem, SideList, Sidebar } from '@open-tabletop/ui-kit'
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

<Sidebar title={t('nav.campaigns')}>
  <SideButtons>
    <button class="primary" onclick={() => go({ name: 'new' })}>{t('nav.newCampaign')}</button>
  </SideButtons>
  {#if campaigns.list.length}
    <input
      class="side-search"
      type="search"
      placeholder={t('nav.search')}
      aria-label={t('nav.search')}
      bind:value={search}
    />
  {/if}
  {#if shown.length}
    <SideList>
      {#each shown as c (c.id)}
        <SideItem
          name={c.name || t('nav.untitled')}
          untitled={!c.name}
          selected={selected === c.id}
          onclick={() => go({ name: 'campaign', id: c.id, tab: 'world' })}
        />
      {/each}
    </SideList>
  {:else if campaigns.loaded}
    <p class="side-help">{campaigns.list.length ? t('nav.noMatch') : t('nav.empty')}</p>
  {/if}
  <a class="side-link" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</Sidebar>
