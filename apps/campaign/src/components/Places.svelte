<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { placeUrl } from '@open-tabletop/character-ui'
  import { onLibraryChange } from '@open-tabletop/storage'
  import type { CampaignPlace } from '@open-tabletop/travel-ui'
  import { appUrl, fullText, InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { placesIn } from '../lib/campaign.svelte'
  import { t } from '../lib/i18n'

  /** The maps and trips in a campaign (each names its own), with links to open them. */
  let { campaign }: { campaign: Campaign } = $props()

  let places = $state<CampaignPlace[]>([])
  let version = $state(0)
  $effect(() => onLibraryChange(() => version++))
  $effect(() => {
    void version
    const id = campaign.id
    // Whether a trip is going on changes as they play: read again.
    void campaign.playing
    void placesIn(id).then((list) => {
      if (campaign.id === id) places = list
    })
  })
  const maps = $derived(places.filter((p) => p.app === 'hexmapper'))
  const trips = $derived(places.filter((p) => p.app === 'travel'))
  const going = (p: CampaignPlace) =>
    campaign.playing?.app === p.app && campaign.playing.id === p.id
</script>

{#snippet list(items: CampaignPlace[], untitled: string, none: string)}
  <ul>
    {#each items as p (p.id)}
      {@const url = placeUrl(p)}
      <li>
        <span class="name" class:untitled={!p.name} use:fullText>{p.name || untitled}</span>
        {#if going(p)}<span class="going"
            >{t('places.going')}<InfoTip text={t('places.goingHelp')} /></span
          >{/if}
        {#if url}<a href={url}>{t('places.open')}</a>{/if}
      </li>
    {:else}
      <li class="help">{none}</li>
    {/each}
  </ul>
{/snippet}

<div class="field">
  <span>{t('places.maps')}<InfoTip markdown={t('places.mapsHelp')} /></span>
  {@render list(maps, t('places.untitledMap'), t('places.noMaps'))}
</div>
<div class="field">
  <span>{t('places.trips')}<InfoTip markdown={t('places.tripsHelp')} /></span>
  {@render list(trips, t('places.untitledTrip'), t('places.noTrips'))}
</div>
<div class="help"><Markdown text={t('places.howTo')} /></div>
<div class="links">
  <a href={appUrl('hexmapper')}>{t('places.newMap')}</a>
  <a href={appUrl('travel')}>{t('places.newTrip')}</a>
</div>

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 14px;
    color: var(--text);
  }

  li {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 4px 6px;
    border-radius: 4px;
  }

  li:hover {
    background: rgb(200 162 74 / 0.08);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .untitled {
    font-style: italic;
    color: var(--text-muted);
  }

  .going {
    font-size: 12px;
    color: var(--accent);
  }

  a {
    font-size: 13px;
    color: var(--accent);
  }

  .links {
    display: flex;
    gap: 16px;
  }

  .help {
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
