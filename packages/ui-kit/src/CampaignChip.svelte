<script lang="ts">
  import { listCampaigns, onAnyCampaignChange } from '@open-tabletop/storage'
  import { campaignUrl, newCampaignUrl } from './apps'
  import MoreMenu from './MoreMenu.svelte'
  import { vocabulary } from './vocabulary'
  import { playIn, playing } from './playing.svelte'

  /**
   * **Playing: <campaign> ▾** in an app's bar: the campaign being played (campaigns.md §11),
   * with **Open in Campaign ↗** and the other campaigns kept here. With `held` (the campaign
   * of the map or trip open, which the app follows), the others open in Campaign instead,
   * since the campaign shown is always the one in front of you; without, choosing one plays
   * in it here, and **No campaign** plays in none.
   */
  let { locale, held }: { locale: string; held?: string } = $props()

  const TEXT = {
    en: {
      playing: 'Playing: {name}',
      none: 'No campaign',
      label: 'The campaign you’re playing',
      open: vocabulary.en.campaign.open,
      untitled: vocabulary.en.campaign.untitled,
      switchTo: 'Play in another',
      noneHelp: 'Play in no campaign',
      openOther: 'To play in another, open one of its maps or trips:',
      start: 'New campaign ↗',
    },
    es: {
      playing: 'Jugando: {name}',
      none: 'Sin campaña',
      label: 'La campaña en la que juegas',
      open: vocabulary.es.campaign.open,
      untitled: vocabulary.es.campaign.untitled,
      switchTo: 'Jugar en otra',
      noneHelp: 'No jugar en ninguna campaña',
      openOther: 'Para jugar en otra, abre uno de sus mapas o viajes:',
      start: 'Campaña nueva ↗',
    },
  }
  const text = $derived(TEXT[locale as keyof typeof TEXT] ?? TEXT.en)

  let campaigns = $state<{ id: string; name: string }[]>([])
  let version = $state(0)
  $effect(() => onAnyCampaignChange(() => version++))
  // Read again when a campaign changes (here or in another window: renamed, kept), and when
  // the campaign shown changes.
  $effect(() => {
    void version
    void held
    void playing.id
    void listCampaigns()
      .then(
        (list) =>
          (campaigns = list
            .map((c) => ({ id: c.id, name: c.name || text.untitled }))
            .sort((a, b) => a.name.localeCompare(b.name, locale))),
      )
      .catch(() => {})
  })

  const id = $derived(held ?? playing.id)
  const name = $derived(campaigns.find((c) => c.id === id)?.name ?? text.untitled)
  const others = $derived(campaigns.filter((c) => c.id !== id))
</script>

<div class="chip" class:none={!id}>
  <MoreMenu label={text.label} align="left">
    {#snippet button()}{id ? text.playing.replace('{name}', name ?? '') : text.none} ▾{/snippet}
    <!-- What every app offers first, alike: then the other campaigns. -->
    {#if id}<a href={campaignUrl(id)}>{text.open}</a>{/if}
    <a href={newCampaignUrl()}>{text.start}</a>
    {#if id && !held}<button onclick={() => playIn(undefined)}>{text.noneHelp}</button>{/if}
    {#if others.length}
      <span class="heading">{held ? text.openOther : text.switchTo}</span>
      {#each others as c (c.id)}
        {#if held}
          <a href={campaignUrl(c.id)}>{c.name}</a>
        {:else}
          <button onclick={() => playIn(c.id)}>{c.name}</button>
        {/if}
      {/each}
    {/if}
  </MoreMenu>
</div>

<style>
  .chip :global(.toggle) {
    color: var(--accent);
    background: transparent;
    border-color: transparent;
  }

  .chip.none :global(.toggle) {
    color: var(--text-muted);
  }

  .chip :global(.list) {
    min-width: 220px;
    max-height: 70vh;
    overflow: auto;
  }

  .heading {
    padding: 8px 10px 2px;
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--panel-border);
  }
</style>
