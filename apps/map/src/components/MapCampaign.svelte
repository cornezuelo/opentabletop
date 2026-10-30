<script lang="ts">
  import { campaignPlaces, type CampaignPlace } from '@open-tabletop/travel-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { keptCampaigns, library, moveToCampaign } from '../lib/io/actions.svelte'
  import { editor } from '../lib/store/editor.svelte'

  /**
   * The campaign the map is in (Map settings → Campaign): another one kept in this browser
   * can be chosen (the map moves to it, asking what stays), and its name changed.
   */
  let campaigns = $state<{ id: string; name: string }[]>([])
  let others = $state<CampaignPlace[]>([])
  let moving = $state(false)
  const own = $derived(editor.meta.id)
  $effect(() => {
    const id = editor.setup.id
    void editor.setup.name
    void library.version
    void keptCampaigns().then((list) => (campaigns = list.filter((c) => c.id !== own)))
    void campaignPlaces(id)
      .then((list) => (others = list.filter((p) => p.app !== 'map' || p.id !== own)))
      .catch(() => (others = []))
  })

  async function choose(select: HTMLSelectElement) {
    moving = true
    try {
      await moveToCampaign(select.value)
    } finally {
      moving = false
      // Cancelled: the choice shows the campaign the map is still in.
      select.value = editor.setup.id
    }
  }

  function rename(input: HTMLInputElement) {
    const name = input.value.trim()
    if (name !== editor.setup.name) editor.setCampaignSetup({ name })
  }

  const placeName = (p: CampaignPlace) =>
    `“${p.name || (p.app === 'map' ? t('map.untitled') : t('campaign.trip'))}”`
</script>

<label class="field">
  <span>{t('campaign.in')}<InfoTip text={t('campaign.help')} /></span>
  <select value={editor.setup.id} disabled={moving} onchange={(e) => choose(e.currentTarget)}>
    <option value={own}>{t('campaign.own')}</option>
    {#each campaigns as c (c.id)}
      <option value={c.id}>{c.name || c.id}</option>
    {/each}
    {#if editor.setup.id !== own && !campaigns.some((c) => c.id === editor.setup.id)}
      <option value={editor.setup.id}>{editor.setup.name || editor.setup.id}</option>
    {/if}
  </select>
</label>
{#if others.length}
  <p class="help">{t('campaign.also', { places: others.map(placeName).join(', ') })}</p>
{/if}

<label class="field">
  <span>{t('campaign.name')}<InfoTip text={t('campaign.nameHelp')} /></span>
  <input
    type="text"
    value={editor.setup.name}
    placeholder={editor.meta.name || t('map.untitled')}
    onchange={(e) => rename(e.currentTarget)}
  />
</label>
