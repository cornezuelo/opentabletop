<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { placeUrl } from '@open-tabletop/character-ui'
  import { onLibraryChange } from '@open-tabletop/storage'
  import { allPlaces, type PlaceInCampaign } from '@open-tabletop/travel-ui'
  import { inCampaignUrl, InfoTip, Markdown, RowCard, RowCards } from '@open-tabletop/ui-kit'
  import { campaigns, open } from '../lib/campaign.svelte'
  import { t } from '../lib/i18n'

  /**
   * The maps (`hexmapper`) or trips (`travel`) of a campaign as cards, each opening where
   * it's played; a new one made in it, or one kept here brought from another campaign (the
   * Hexmapper or Travel opens and moves it, asking what stays as their own settings do).
   */
  let { campaign, app }: { campaign: Campaign; app: 'hexmapper' | 'travel' } = $props()

  let places = $state<PlaceInCampaign[]>([])
  let version = $state(0)
  $effect(() => onLibraryChange(() => version++))
  $effect(() => {
    void version
    // Whether a trip is going on changes as they play: read again.
    void campaign.playing
    void allPlaces().then((list) => (places = list))
  })
  const kind = $derived(app === 'hexmapper' ? 'maps' : 'trips')
  const mine = $derived(places.filter((p) => p.app === app && p.campaign === campaign.id))
  const others = $derived(places.filter((p) => p.app === app && p.campaign !== campaign.id))
  let adding = $state(false)

  const going = (p: PlaceInCampaign) =>
    campaign.playing?.app === p.app && campaign.playing.id === p.id
  /** Where another one is now: a campaign kept here by its name, or one of its own. */
  const whereNow = (p: PlaceInCampaign) => {
    const kept = campaigns.list.find((c) => c.id === p.campaign)
    return kept && p.campaign !== p.id ? kept.name || t('nav.untitled') : t('places.ownCampaign')
  }
  /** What a map is like: its size in hexes. */
  const size = (p: PlaceInCampaign) => {
    const map = open.maps.find((m) => m.meta.id === p.id)
    return map ? `${map.grid.width}×${map.grid.height}` : ''
  }
  const untitled = $derived(t(app === 'hexmapper' ? 'places.untitledMap' : 'places.untitledTrip'))
</script>

<div class="head">
  <div class="help"><Markdown text={t(`places.${kind}Intro`)} /></div>
  <div class="actions">
    <a class="button primary" href={inCampaignUrl(app, campaign.id)}>{t(`places.new.${kind}`)}</a>
    {#if others.length}
      <button class="button" aria-expanded={adding} onclick={() => (adding = !adding)}
        >{t(`places.add.${kind}`)}</button
      >
    {/if}
  </div>
</div>

{#if adding}
  <section class="adding">
    <h3>{t(`places.addTitle.${kind}`)}<InfoTip markdown={t(`places.addHelp.${kind}`)} /></h3>
    <RowCards>
      {#each others as p (p.id)}
        <RowCard plain name={p.name || untitled} untitled={!p.name} meta={whereNow(p)}>
          <a href={inCampaignUrl(app, campaign.id, p.id)}>{t('places.bring')}</a>
        </RowCard>
      {/each}
    </RowCards>
  </section>
{/if}

{#if mine.length}
  <RowCards>
    {#each mine as p (p.id)}
      {@const url = placeUrl(p)}
      <RowCard
        name={p.name || untitled}
        untitled={!p.name}
        meta={app === 'hexmapper' ? size(p) : undefined}
        highlight={going(p)}
      >
        {#if going(p)}<span class="badge"
            >{t('places.going')}<InfoTip text={t('places.goingHelp')} /></span
          >{/if}
        {#if url}<a href={url}>{t(going(p) ? 'places.continue' : 'places.open')}</a>{/if}
      </RowCard>
    {/each}
  </RowCards>
{:else}
  <p class="help">{t(`places.none.${kind}`)}</p>
{/if}

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .head .help {
    flex: 1 1 320px;
  }

  .help :global(p) {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .adding {
    padding: 10px 12px;
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  .adding h3 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .badge {
    font-size: 12px;
    color: var(--accent);
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
