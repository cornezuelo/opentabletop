<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { AppShell, Dialogs, Toasts, Welcome } from '@open-tabletop/ui-kit'
  import CharacterView from './components/CharacterView.svelte'
  import BestiaryView from './components/BestiaryView.svelte'
  import NewCharacter from './components/NewCharacter.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
</script>

<AppShell
  app="characters"
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
  {#snippet help()}<HelpPanel app="characters" locale={getLocale()} />{/snippet}
  {#if nav.view.name === 'character'}
    {#key nav.view.id}<CharacterView id={nav.view.id} />{/key}
  {:else if nav.view.name === 'bestiary'}
    {#key `${nav.view.bestiary}:${nav.view.template}`}
      <BestiaryView bestiary={nav.view.bestiary} template={nav.view.template} />
    {/key}
  {:else if nav.view.name === 'new'}
    <NewCharacter />
  {:else}
    <Welcome title={t('welcome.title')} tagline={t('app.tagline')} body={t('welcome.body')} />
  {/if}
</AppShell>

<Toasts />
<Dialogs />
