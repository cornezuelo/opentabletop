<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { AppShell, Dialogs, playing, Spinner, Toasts } from '@open-tabletop/ui-kit'
  import CampaignView from './components/CampaignView.svelte'
  import NewCampaign from './components/NewCampaign.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { campaigns } from './lib/campaign.svelte'

  // Opened without a campaign (the site's root, Home): the one being played, else the
  // newest; with none yet, making one is all it offers.
  $effect(() => {
    if (nav.view.name !== 'welcome' || !campaigns.loaded) return
    const current = playing.id
    const to = campaigns.list.find((c) => c.id === current) ?? campaigns.list[0]
    if (to) go({ name: 'campaign', id: to.id, tab: 'overview' }, true)
  })
</script>

<AppShell
  app="campaign"
  name={t('app.title')}
  locale={getLocale()}
  {locales}
  onlocale={(locale) => setLocale(locale as 'en' | 'es')}
  onhome={() => go({ name: 'welcome' })}
  held={nav.view.name === 'campaign' ? nav.view.id : undefined}
  texts={{
    help: t('nav.help'),
    showSidebar: t('nav.showSidebar'),
    hideSidebar: t('nav.hideSidebar'),
    showHelp: t('nav.showHelp'),
    hideHelp: t('nav.hideHelp'),
  }}
>
  {#snippet sidebar()}<Sidebar />{/snippet}
  {#snippet help()}<HelpPanel app="campaign" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'campaign'}
    <CampaignView id={nav.view.id} tab={nav.view.tab} faction={nav.view.faction} />
  {:else if nav.view.name === 'new'}
    <NewCampaign />
  {:else if campaigns.loaded && !campaigns.list.length}
    <NewCampaign first />
  {:else if !campaigns.loaded}
    <Spinner label={t('nav.loading')} shown />
  {/if}
</AppShell>

<Toasts />
<Dialogs />
