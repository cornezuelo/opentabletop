<script lang="ts">
  import { campaignUrl, InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { campaignChoice, keeper } from '../lib/oracle.svelte'

  /**
   * Which campaign hand rolls go to (its decks, once-only entries and history): the one being
   * played, chosen in the bar's **Playing**, or none.
   */
  const name = $derived(
    campaignChoice.id
      ? keeper.campaign?.id === campaignChoice.id
        ? keeper.campaign.name || campaignChoice.id
        : campaignChoice.id
      : t('campaign.none'),
  )
</script>

<div class="campaign">
  <span>{t('campaign.title')}<InfoTip text={t('campaign.help')} /></span>
  <strong>{name}</strong>
  {#if campaignChoice.id}<a href={campaignUrl(campaignChoice.id)}>{t('campaign.open')}</a>{/if}
</div>

<style>
  .campaign {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  strong {
    font-size: 13px;
    font-weight: normal;
    color: var(--text);
  }

  .campaign a {
    align-self: flex-start;
    color: var(--accent);
  }
</style>
