<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { UndoButtons } from '@open-tabletop/pack-ui'
  import {
    AppShell,
    Dialogs,
    readLastSystem,
    rememberSystem,
    Toasts,
    Welcome,
  } from '@open-tabletop/ui-kit'
  import SystemView from './components/SystemView.svelte'
  import { library, systems } from './lib/packs.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'

  // Opened without a view, it starts on the system last chosen here or in another app.
  const last = location.hash ? undefined : readLastSystem()
  if (last && systems.get(last)) go({ name: 'system', id: last, tab: 'overview' }, true)
  $effect(() => {
    if (nav.view.name === 'system' && systems.get(nav.view.id)) rememberSystem(nav.view.id)
  })
</script>

<AppShell
  app="systems"
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
  {#snippet bar()}<UndoButtons
      {library}
      undoLabel={t('nav.undo')}
      redoLabel={t('nav.redo')}
    />{/snippet}
  {#snippet help()}<HelpPanel app="systems" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'system'}
    {#key nav.view.id}<SystemView id={nav.view.id} tab={nav.view.tab} />{/key}
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')} />
  {/if}
</AppShell>

<Toasts />
<Dialogs />
