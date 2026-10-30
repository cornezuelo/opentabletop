<script lang="ts">
  import { WorldClock, WorldTimeline, WorldWaiting } from '@open-tabletop/campaign-ui'
  import { placeUrl } from '@open-tabletop/character-ui'
  import { calendarOf, systemName } from '@open-tabletop/session'
  import {
    APPS,
    appUrl,
    InfoTip,
    Markdown,
    MoreMenu,
    Spinner,
    NoteRefInput,
    playIn,
    Tabs,
  } from '@open-tabletop/ui-kit'
  import { open, removeCampaign } from '../lib/campaign.svelte'
  import { getLocale, t } from '../lib/i18n'
  import { go, TABS, type Tab } from '../lib/nav.svelte'
  import Cast from './Cast.svelte'
  import Factions from './Factions.svelte'
  import Overview from './Overview.svelte'
  import PlaceList from './PlaceList.svelte'

  /**
   * A campaign: its name, system and notes, and its world in tabs (an Overview first). The
   * one opened is the one being played: Campaign opens it again next time.
   */
  let { id, tab, faction }: { id: string; tab: Tab; faction?: string } = $props()

  $effect(() => {
    void open.open(id)
  })
  $effect(() => {
    if (open.found && open.id === id) playIn(id)
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
    if (campaign && (await removeCampaign(campaign))) {
      playIn(undefined)
      go({ name: 'welcome' }, true)
    }
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
      <MoreMenu label={t('campaign.more')}>
        <button class="danger" onclick={remove}>{t('campaign.delete')}</button>
      </MoreMenu>
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

    <!-- What the world waits for shows on every tab (the World tab's clock shows it itself). -->
    {#if open.waiting() && tab !== 'world'}
      <WorldWaiting
        locale={getLocale()}
        waiting={open.waiting()!}
        onanswer={(choice) => open.controls.answer(choice)}
      />
    {/if}

    <Tabs
      tabs={TABS.map((each) => ({ id: each, label: tabName(each) }))}
      value={tab}
      label={t('tabs.label')}
      prefix="campaign"
      onchange={(each) => go({ name: 'campaign', id, tab: each }, true)}
    />

    <div class="tab" id="campaign-panel" role="tabpanel" aria-labelledby="campaign-tab-{tab}">
      {#if tab === 'overview'}
        <Overview {campaign} />
      {:else if tab === 'world'}
        <WorldClock
          locale={getLocale()}
          world={campaign.world}
          {calendar}
          controls={open.controls}
          weather={open.weather()}
          clocks={system.clocks}
          worldRules={system.world}
          missing={open.missing()}
          defaultStart={calendar.at(1, '06:00')}
          timeline={false}
          waiting={open.waiting()}
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
      {:else if tab === 'maps'}
        <PlaceList {campaign} app="hexmapper" />
      {:else if tab === 'trips'}
        <PlaceList {campaign} app="travel" />
      {:else}
        <Cast {campaign} />
      {/if}
    </div>
  </article>
{:else}
  <Spinner label={t('nav.loading')} shown />
{/if}

<style>
  .campaign {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 1100px;
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
