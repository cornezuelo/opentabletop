<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { WorldClock, WorldGlance, WorldTimeline } from '@open-tabletop/campaign-ui'
  import { placeUrl, roster } from '@open-tabletop/character-ui'
  import { calendarOf } from '@open-tabletop/session'
  import { onLibraryChange } from '@open-tabletop/storage'
  import { campaignPlaces, type CampaignPlace } from '@open-tabletop/travel-ui'
  import { inCampaignUrl, InfoTip } from '@open-tabletop/ui-kit'
  import { open } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go, type Tab } from '../lib/nav.svelte'

  /**
   * What is going on in a campaign, at a glance: today (the date and weather, moving time on),
   * the trip going on, what comes next, its progress clocks, the latest of its timeline, its
   * maps, trips and cast; each block leads to its tab.
   */
  let { campaign }: { campaign: Campaign } = $props()

  const system = $derived(open.system)
  const calendar = $derived(calendarOf(system))
  const world = $derived(campaign.world)

  let places = $state<CampaignPlace[]>([])
  let version = $state(0)
  $effect(() => onLibraryChange(() => version++))
  $effect(() => {
    void version
    void campaign.playing
    const id = campaign.id
    void campaignPlaces(id).then((list) => {
      if (campaign.id === id) places = list
    })
  })
  const maps = $derived(places.filter((p) => p.app === 'map').length)
  const trips = $derived(places.filter((p) => p.app === 'travel').length)
  const cast = $derived(
    roster.roster.characters.filter(
      (e) => e.playing && places.some((p) => p.app === e.playing!.app && p.id === e.playing!.id),
    ).length,
  )
  const factions = $derived(campaign.factions?.factions.length ?? 0)
  const playingUrl = $derived(campaign.playing && placeUrl(campaign.playing))
  const show = (tab: Tab) => go({ name: 'campaign', id: campaign.id, tab }, true)
</script>

{#snippet title(tab: Tab, key: 'today' | 'next' | 'clocks' | 'latest')}
  <h3>
    <button class="to" onclick={() => show(tab)}>{t(`overview.${key}`)}</button>
  </h3>
{/snippet}

<div class="blocks">
  <section class="today">
    {@render title('world', 'today')}
    <WorldClock
      locale={getLocale()}
      {world}
      {calendar}
      controls={open.controls}
      weather={open.weather()}
      clocks={system.clocks}
      worldRules={system.world}
      missing={open.missing()}
      defaultStart={calendar.at(1, '06:00')}
      timeline={false}
      stoppable={false}
      part="now"
      waiting={open.waiting()}
    />
  </section>

  <section>
    <h3>{t('overview.going')}<InfoTip markdown={t('overview.goingHelp')} /></h3>
    {#if campaign.playing}
      <p class="playing">
        <strong>{campaign.playing.name || t('places.untitledTrip')}</strong>
        {#if playingUrl}<a href={playingUrl}>{t('places.continue')}</a>{/if}
      </p>
    {:else}
      <p class="none">{t('overview.nothingGoing')}</p>
      <p class="links">
        <a href={inCampaignUrl('travel', campaign.id)}>{t('places.new.trips')}</a>
        <a href={inCampaignUrl('map', campaign.id)}>{t('places.new.maps')}</a>
      </p>
    {/if}
    <ul class="counts">
      <li>
        <button class="to" onclick={() => show('maps')}
          >{t('overview.maps', { count: maps })}</button
        >
      </li>
      <li>
        <button class="to" onclick={() => show('trips')}
          >{t('overview.trips', { count: trips })}</button
        >
      </li>
      <li>
        <button class="to" onclick={() => show('characters')}
          >{t('overview.cast', { count: cast })}</button
        >
      </li>
      {#if factions}<li>
          <button class="to" onclick={() => show('factions')}
            >{t('overview.factions', { count: factions })}</button
          >
        </li>{/if}
    </ul>
  </section>

  {#if world}
    <section>
      {@render title('world', 'next')}
      <WorldGlance locale={getLocale()} {world} {calendar} part="events" />
    </section>
    <section>
      {@render title('world', 'clocks')}
      <WorldGlance locale={getLocale()} {world} {calendar} part="clocks" />
    </section>
    <section class="wide">
      {@render title('timeline', 'latest')}
      <WorldTimeline
        locale={getLocale()}
        {world}
        {calendar}
        controls={open.controls}
        limit={5}
        scroll={false}
      />
    </section>
  {/if}
</div>

<style>
  .blocks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px;
    align-items: start;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .wide {
    grid-column: 1 / -1;
  }

  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .to {
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .to:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .playing {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin: 0;
  }

  .none {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
  }

  a {
    font-size: 13px;
    color: var(--accent);
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin: 4px 0 0;
    padding: 0;
    font-size: 13px;
    list-style: none;
  }
</style>
