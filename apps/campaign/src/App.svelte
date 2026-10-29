<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { AppShell, Dialogs, Toasts, Welcome } from '@open-tabletop/ui-kit'
  import CampaignView from './components/CampaignView.svelte'
  import NewCampaign from './components/NewCampaign.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
</script>

<AppShell
  app="campaign"
  name={t('app.title')}
  locale={getLocale()}
  {locales}
  onlocale={(locale) => setLocale(locale as 'en' | 'es')}
  onhome={() => go({ name: 'welcome' })}
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
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')} />
  {/if}
</AppShell>

<Toasts />
<Dialogs />
