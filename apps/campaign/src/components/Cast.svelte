<script lang="ts">
  import type { Campaign } from '@open-tabletop/campaign'
  import { characterUrl, placeUrl, roster } from '@open-tabletop/character-ui'
  import type { RosterEntry } from '@open-tabletop/session'
  import { onLibraryChange } from '@open-tabletop/storage'
  import { campaignPlaces, type CampaignPlace } from '@open-tabletop/travel-ui'
  import { appUrl, Markdown, RowCard, RowCards } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'

  /**
   * A campaign's cast: the characters of the roster playing in its trips (party members, those
   * present), on its maps' tokens, or in it without a trip (a quick game), each with where it
   * plays and links to it.
   */
  let { campaign }: { campaign: Campaign } = $props()

  let places = $state<CampaignPlace[]>([])
  let version = $state(0)
  $effect(() => onLibraryChange(() => version++))
  $effect(() => {
    void version
    const id = campaign.id
    void campaignPlaces(id).then((list) => {
      if (campaign.id === id) places = list
    })
  })
  const isHere = (e: RosterEntry) =>
    !!e.playing &&
    ((e.playing.app === 'campaign' && e.playing.id === campaign.id) ||
      places.some((p) => p.app === e.playing!.app && p.id === e.playing!.id))
  const cast = $derived(
    roster.roster.characters
      .filter(isHere)
      .sort((a, b) => (a.character.name || '').localeCompare(b.character.name || '')),
  )
</script>

<div class="help"><Markdown text={t('cast.intro')} /></div>
{#if cast.length}
  <RowCards>
    {#each cast as { character, playing } (character.id)}
      {@const url = playing && placeUrl(playing)}
      <RowCard
        name={character.name || character.id}
        href={characterUrl(character.id)}
        meta={playing
          ? playing.app === 'campaign'
            ? t('cast.noTrip')
            : t(playing.token ? 'cast.onToken' : 'cast.onTrip', { place: playing.name })
          : undefined}
      >
        {#if url && playing && playing.app !== 'campaign'}<a href={url}>{t('places.open')}</a>{/if}
      </RowCard>
    {/each}
  </RowCards>
{:else}
  <p class="none">{t('cast.none')}</p>
{/if}
<a class="roster" href={appUrl('characters')}>{t('cast.roster')}</a>

<style>
  a {
    font-size: 13px;
    color: var(--accent);
  }

  .help,
  .none {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .help :global(p) {
    margin: 0;
  }

  .roster {
    align-self: flex-start;
  }
</style>
