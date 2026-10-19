<script lang="ts">
  import { WorldClock, WorldTimeline } from '@open-tabletop/campaign-ui'
  import { placeUrl } from '@open-tabletop/character-ui'
  import { calendarOf, systemName } from '@open-tabletop/session'
  import { APPS, appUrl, InfoTip, Markdown, NoteRefInput } from '@open-tabletop/ui-kit'
  import { open, removeCampaign } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go, TABS, type Tab } from '../lib/nav.svelte'
  import Factions from './Factions.svelte'
  import Places from './Places.svelte'

  /** A campaign: its name, system and notes, and its world in tabs. */
  let { id, tab, faction }: { id: string; tab: Tab; faction?: string } = $props()

  $effect(() => {
    void open.open(id)
  })
  const campaign = $derived(open.campaign)
  const system = $derived(open.system)
  const calendar = $derived(calendarOf(system))
  const label = $derived(campaign?.name || t('nav.untitled'))
  const appName = (app: string) => APPS.find((a) => a.id === app)?.name ?? app

  function rename(input: HTMLInputElement) {
    const name = input.value.trim()
    if (campaign && name !== campaign.name) open.set({ ...campaign, name })
  }

  function setNote(value: string) {
    if (!campaign) return
    const next = { ...campaign }
    if (value.trim()) next.noteRef = value.trim()
    else delete next.noteRef
    open.set(next)
  }

  async function remove() {
    if (campaign && (await removeCampaign(campaign))) go({ name: 'welcome' }, true)
  }

  const tabName = (tab: Tab) => t(`tabs.${tab}`)
</script>

{#if open.found === false && open.id === id}
  <p class="help">{t('campaign.missing')}</p>
{:else if campaign}
  <article class="campaign">
    <header>
      <input
        class="title"
        type="text"
        value={campaign.name}
        placeholder={t('nav.untitled')}
        aria-label={t('campaign.name')}
        onchange={(e) => rename(e.currentTarget)}
      />
      <div class="buttons">
        <button class="danger" onclick={remove}>{t('campaign.delete')}</button>
      </div>
    </header>

    <dl class="facts">
      <dt>{t('campaign.system')}<InfoTip markdown={t('campaign.systemHelp')} /></dt>
      <dd>
        {campaign.system ? systemName(system, getLocale()) : t('campaign.noSystem')}
        <a href="{appUrl('systems')}#/system/{encodeURIComponent(system.id)}"
          >{t('campaign.editSystem')}</a
        >
      </dd>
      <dt>{t('campaign.notes')}<InfoTip markdown={t('campaign.notesHelp')} /></dt>
      <dd>
        <NoteRefInput
          value={campaign.noteRef ?? ''}
          placeholder={label}
          label={t('campaign.notes')}
          locale={getLocale()}
          onchange={setNote}
        />
      </dd>
    </dl>

    {#if campaign.playing}
      {@const url = placeUrl(campaign.playing)}
      <p class="playing">
        {t('campaign.playing', {
          name: campaign.playing.name || label,
          app: appName(campaign.playing.app),
        })}<InfoTip markdown={t('campaign.playingHelp')} />
        {#if url}<a href={url}>{t('campaign.open')}</a>{/if}
      </p>
    {/if}

    <div class="tabs" role="tablist" aria-label={t('tabs.label')}>
      {#each TABS as each (each)}
        <button
          role="tab"
          aria-selected={tab === each}
          class:active={tab === each}
          onclick={() => go({ name: 'campaign', id, tab: each }, true)}>{tabName(each)}</button
        >
      {/each}
    </div>

    <div class="tab" role="tabpanel" aria-label={tabName(tab)}>
      {#if tab === 'world'}
        <p class="help">{t('world.help')}</p>
        <WorldClock
          locale={getLocale()}
          world={campaign.world}
          {calendar}
          controls={open.controls}
          weather={open.weather()}
          clocks={system.clocks}
          missing={open.missing()}
          defaultStart={calendar.at(1, '06:00')}
          timeline={false}
        />
      {:else if tab === 'factions'}
        <Factions {campaign} {faction} />
      {:else if tab === 'timeline'}
        {#if campaign.world}
          <WorldTimeline
            locale={getLocale()}
            world={campaign.world}
            {calendar}
            controls={open.controls}
            limit={500}
            scroll={false}
          />
        {:else}
          <div class="help"><Markdown text={t('timeline.none')} /></div>
        {/if}
      {:else}
        <Places {campaign} />
      {/if}
    </div>
  </article>
{/if}

<style>
  .campaign {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 720px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    flex: 1;
    min-width: 0;
    padding: 2px 4px;
    font-family: Georgia, serif;
    font-size: 26px;
    color: var(--text);
    background: none;
    border: 1px solid transparent;
  }

  .title:hover,
  .title:focus {
    border-color: var(--panel-border);
  }

  .buttons {
    display: flex;
    gap: 6px;
  }

  .buttons button {
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons .danger {
    color: var(--danger, #d9534f);
  }

  .facts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 14px;
    align-items: baseline;
    margin: 0;
    font-size: 13px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  a {
    color: var(--accent);
  }

  .playing {
    margin: 0;
    padding: 6px 10px;
    font-size: 13px;
    background: rgb(200 162 74 / 0.08);
    border-left: 2px solid var(--accent);
    border-radius: 0 4px 4px 0;
  }

  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--panel-border);
  }

  .tabs button {
    padding: 6px 12px;
    font-size: 13px;
    color: var(--text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
  }

  .tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
