<script lang="ts">
  import { listCampaigns } from '@open-tabletop/storage'
  import { campaignUrl, InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { campaignChoice, chooseCampaign, keeper } from '../lib/oracle.svelte'

  /** Which campaign hand rolls go to: its decks, once-only entries and history, or none. */
  let campaigns = $state<{ id: string; name: string }[]>([])
  $effect(() => {
    void campaignChoice.id
    void keeper.campaign
    void listCampaigns()
      .then((list) => (campaigns = list.map((c) => ({ id: c.id, name: c.name || c.id }))))
      .catch(() => {})
  })
</script>

<label class="campaign">
  <span>{t('campaign.title')}<InfoTip text={t('campaign.help')} /></span>
  <select value={campaignChoice.id} onchange={(e) => chooseCampaign(e.currentTarget.value)}>
    <option value="">{t('campaign.none')}</option>
    {#each campaigns as c (c.id)}
      <option value={c.id}>{c.name}</option>
    {/each}
    {#if campaignChoice.id && !campaigns.some((c) => c.id === campaignChoice.id)}
      <option value={campaignChoice.id}>{keeper.campaign?.name || campaignChoice.id}</option>
    {/if}
  </select>
  {#if campaignChoice.id}<a href={campaignUrl(campaignChoice.id)}>{t('campaign.open')}</a>{/if}
</label>

<style>
  .campaign {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .campaign a {
    align-self: flex-start;
    color: var(--accent);
  }
</style>
