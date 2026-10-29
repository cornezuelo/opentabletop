<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { InfoTip, NewForm, readLastSystem } from '@open-tabletop/ui-kit'
  import { newCampaign } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** Makes an empty campaign with a name and a system (the last system chosen, first). */
  const last = readLastSystem()
  let system = $state(systems.list.find((s) => s.id === last)?.id ?? systems.list[0]?.id ?? '')
  let name = $state('')
  let busy = $state(false)

  async function create() {
    if (!name.trim() || busy) return
    busy = true
    try {
      const id = await newCampaign(name, system)
      go({ name: 'campaign', id, tab: 'world' })
    } finally {
      busy = false
    }
  }
</script>

<NewForm
  title={t('new.title')}
  create={t('new.create')}
  disabled={!name.trim() || busy}
  onsubmit={create}
>
  <label class="field">
    <span>{t('new.name')}</span>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="text"
      required
      bind:value={name}
      placeholder={t('new.namePlaceholder')}
      autofocus
    />
  </label>
  <label class="field">
    <span>{t('new.system')}<InfoTip markdown={t('new.systemHelp')} /></span>
    <select bind:value={system}>
      {#each systems.list as s (s.id)}
        <option value={s.id}>{systemName(s, getLocale())}</option>
      {/each}
    </select>
  </label>
</NewForm>
