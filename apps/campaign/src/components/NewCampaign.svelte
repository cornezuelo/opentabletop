<script lang="ts">
  import { DateInput } from '@open-tabletop/campaign-ui'
  import { calendarOf, systemName } from '@open-tabletop/session'
  import { appUrl, InfoTip, Markdown, NewForm, readLastSystem } from '@open-tabletop/ui-kit'
  import { newCampaign } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { systems } from '../lib/packs.svelte'

  /**
   * Makes a campaign with a name and a system (the last system chosen, first), starting on a
   * day of its calendar with its world clock going and the system's factions in, unless
   * unticked. `first`: none kept yet, so it's the first thing the app offers.
   */
  let { first = false }: { first?: boolean } = $props()

  const last = readLastSystem()
  let system = $state(systems.list.find((s) => s.id === last)?.id ?? systems.list[0]?.id ?? '')
  let name = $state('')
  let busy = $state(false)
  const chosen = $derived(systems.get(system))
  const calendar = $derived(calendarOf(chosen))
  const factions = $derived(Object.keys(chosen.factions?.def.factions ?? {}).length)
  // Each system's calendar starts on its own first morning, until another day is chosen.
  let start = $derived(calendar.at(1, '06:00'))
  let clock = $state(true)
  let bring = $state(true)

  async function create() {
    if (!name.trim() || busy) return
    busy = true
    try {
      const id = await newCampaign(name, system, {
        ...(clock && { start }),
        factions: bring && factions > 0,
      })
      go({ name: 'campaign', id, tab: 'overview' })
    } finally {
      busy = false
    }
  }
</script>

<NewForm
  title={first ? t('new.firstTitle') : t('new.title')}
  create={t('new.create')}
  disabled={!name.trim() || busy}
  {busy}
  onsubmit={create}
>
  {#if first}<div class="intro"><Markdown text={t('new.firstIntro')} /></div>{/if}
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
  <label class="check">
    <input type="checkbox" bind:checked={clock} />
    <span>{t('new.clock')}<InfoTip markdown={t('new.clockHelp')} /></span>
  </label>
  {#if clock}
    <div class="field">
      <span>{t('new.start')}</span>
      {#key system}<DateInput {calendar} bind:value={start} locale={getLocale()} />{/key}
    </div>
  {/if}
  {#if factions}
    <label class="check">
      <input type="checkbox" bind:checked={bring} />
      <span
        >{t('new.factions', { count: factions })}<InfoTip markdown={t('new.factionsHelp')} /></span
      >
    </label>
  {/if}
</NewForm>
{#if first}
  <p class="others">
    {t('new.without')}
    <a href={appUrl('oracle')}>{t('apps.oracle')}</a> ·
    <a href={appUrl('characters')}>{t('apps.characters')}</a> ·
    <a href={appUrl('map')}>{t('apps.map')}</a>
  </p>
{/if}

<style>
  .intro {
    color: var(--text-muted);
  }

  .intro :global(p) {
    margin: 0 0 6px;
  }

  .check {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .others {
    margin: 24px 0 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .others a {
    color: var(--accent);
  }
</style>
