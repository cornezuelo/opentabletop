<script lang="ts">
  import { systemName } from '@open-tabletop/session'
  import { InfoTip, readLastSystem } from '@open-tabletop/ui-kit'
  import { newCampaign } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /** Makes an empty campaign with a name and a system (the last system chosen, first). */
  const last = readLastSystem()
  let system = $state(systems.list.find((s) => s.id === last)?.id ?? systems.list[0]?.id ?? '')
  let name = $state('')
  let busy = $state(false)

  async function create(e: SubmitEvent) {
    e.preventDefault()
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

<h1>{t('new.title')}</h1>
<form onsubmit={create}>
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
  <button class="primary" type="submit" disabled={!name.trim() || busy}>{t('new.create')}</button>
</form>

<style>
  h1 {
    margin: 0 0 16px;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
  }

  .primary {
    align-self: start;
    padding: 6px 14px;
    color: var(--accent);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.4;
  }
</style>
