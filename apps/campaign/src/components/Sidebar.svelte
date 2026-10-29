<script lang="ts">
  import { appUrl, SideButtons, SideItem, SideList, Sidebar } from '@open-tabletop/ui-kit'
  import { shortTime } from '@open-tabletop/campaign-ui'
  import { calendarOf, systemName } from '@open-tabletop/session'
  import { campaigns, type CampaignItem } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { systems } from '../lib/packs.svelte'
  import { go, nav } from '../lib/nav.svelte'

  /** The campaigns this browser keeps, newest first (each with its system and date), with a search box. */
  const selected = $derived(nav.view.name === 'campaign' ? nav.view.id : undefined)
  let search = $state('')

  /** Its system, and its world clock's date if going. */
  function detail(c: CampaignItem): string {
    const system = systems.get(c.system)
    const name = systemName(system, getLocale())
    return c.time === undefined
      ? name
      : `${name} · ${shortTime(calendarOf(system), c.time, getLocale())}`
  }

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
          detail={detail(c)}
          untitled={!c.name}
          selected={selected === c.id}
          onclick={() => go({ name: 'campaign', id: c.id, tab: 'overview' })}
        />
      {/each}
    </SideList>
  {:else if campaigns.loaded}
    <p class="side-help">{campaigns.list.length ? t('nav.noMatch') : t('nav.empty')}</p>
  {/if}
  <a class="side-link" href={appUrl('systems')}>{t('nav.makeSystems')}</a>
</Sidebar>
