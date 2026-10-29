<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import {
    AppShell,
    Dialogs,
    parseInCampaign,
    playIn,
    playing,
    readLastSystem,
    rememberSystem,
    Toasts,
    Welcome,
  } from '@open-tabletop/ui-kit'
  import SystemView from './components/SystemView.svelte'
  import { systems } from './lib/packs.svelte'
  import { trip } from './lib/trip.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { openInCampaign } from './lib/inCampaign'

  // A trip put in a campaign from the Campaign app: a new one, or one kept here joining it.
  const inCampaign = parseInCampaign(location.hash)
  if (inCampaign) {
    history.replaceState(null, '', '#/')
    void openInCampaign(inCampaign.campaign, inCampaign.id).then((system) => {
      if (system) go({ name: 'system', id: system }, true)
    })
  }

  // Opened in a campaign (the bar's **Playing**) another trip is in: its latest trip opens.
  let fromPlaying = false
  if (!inCampaign && playing.id && trip.saved.campaign !== playing.id) {
    const latest = trip.trips.findLast((saved) => saved.campaign === playing.id)
    if (latest) {
      trip.open(latest.id)
      fromPlaying = true
    }
  }
  // …and from then on the bar's **Playing** follows the open trip's campaign, once it's going
  // on (a trip not started yet plays nowhere).
  $effect(() => {
    if (trip.inCampaigns && trip.saved.session) playIn(trip.saved.campaign)
  })

  // Opened without a view, it starts on that trip's system, else the system last chosen here
  // or in another app.
  const last =
    location.hash || inCampaign ? undefined : fromPlaying ? trip.saved.system : readLastSystem()
  if (last && systems.get(last)) go({ name: 'system', id: last }, true)
  $effect(() => {
    if (nav.view.name === 'system' && systems.get(nav.view.id)) rememberSystem(nav.view.id)
  })
  // A link to a saved trip: it opens, and its system's page shows it.
  $effect(() => {
    if (nav.view.name !== 'trip') return
    trip.open(nav.view.id)
    go({ name: 'system', id: trip.saved.system }, true)
  })
</script>

<AppShell
  app="travel"
  name={t('app.title')}
  locale={getLocale()}
  {locales}
  onlocale={(locale) => setLocale(locale as 'en' | 'es')}
  onhome={() => go({ name: 'welcome' })}
  held={trip.saved.session ? trip.saved.campaign : undefined}
  texts={{
    help: t('nav.help'),
    showSidebar: t('nav.showSidebar'),
    hideSidebar: t('nav.hideSidebar'),
    showHelp: t('nav.showHelp'),
    hideHelp: t('nav.hideHelp'),
  }}
>
  {#snippet sidebar()}<Sidebar />{/snippet}
  {#snippet help()}<HelpPanel app="travel" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'system'}
    {#key nav.view.id}<SystemView id={nav.view.id} />{/key}
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')} />
  {/if}
</AppShell>

<Toasts />
<Dialogs />
