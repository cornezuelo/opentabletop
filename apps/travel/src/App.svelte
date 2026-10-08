<script lang="ts">
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import {
    AppBrand,
    AppSwitcher,
    contextHelp,
    Dialogs,
    FoldTab,
    PreferencesButton,
    readLastSystem,
    rememberSystem,
    Toasts,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import Sidebar from './components/Sidebar.svelte'
  import SystemView from './components/SystemView.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { systems } from './lib/packs.svelte'

  // Opened without a view, it starts on the system last chosen here or in another app.
  const last = location.hash ? undefined : readLastSystem()
  if (last && systems.get(last)) go({ name: 'system', id: last }, true)
  $effect(() => {
    if (nav.view.name === 'system' && systems.get(nav.view.id)) rememberSystem(nav.view.id)
  })

  let help = $state(false)
  /** Whether the systems list is shown: a per-viewer preference, kept in this browser. */
  const LAYOUT = 'opentabletop.travel.layout'
  function readSidebar(): boolean {
    try {
      return JSON.parse(localStorage.getItem(LAYOUT) ?? '{}').sidebar !== false
    } catch {
      return true
    }
  }
  let sidebar = $state(readSidebar())
  function toggleSidebar() {
    sidebar = !sidebar
    try {
      localStorage.setItem(LAYOUT, JSON.stringify({ sidebar }))
    } catch {
      // Not remembered; it still applies now.
    }
  }
  // A dotted label clicked: the help column opens on its explanation.
  $effect(() => {
    if (contextHelp.asked) help = true
  })
  $effect(() => {
    contextHelp.shown = help
  })
</script>

<div class="app" class:help class:no-sidebar={!sidebar}>
  <header class="bar">
    <AppBrand app="travel" name={t('app.title')} onclick={() => go({ name: 'welcome' })} />
    <AppSwitcher current="travel" locale={getLocale()} />
    <div class="spacer"></div>
    <PreferencesButton
      locale={getLocale()}
      {locales}
      onlocale={(locale) => setLocale(locale as 'en' | 'es')}
    />
    <button
      class="help-toggle"
      class:active={help}
      aria-pressed={help}
      aria-label={t('nav.help')}
      use:tooltip={t('nav.help')}
      onclick={() => (help = !help)}>?</button
    >
  </header>

  {#if sidebar}<Sidebar />{/if}

  <div class="center">
    <FoldTab
      side="left"
      open={sidebar}
      show={t('nav.showSidebar')}
      hide={t('nav.hideSidebar')}
      ontoggle={toggleSidebar}
    />
    <main>
      {#if nav.view.name === 'system'}
        {#key nav.view.id}<SystemView id={nav.view.id} />{/key}
      {:else}
        <div class="welcome">
          <h1>{t('welcome.title')}</h1>
          <p class="tagline">{t('app.tagline')}</p>
          <p>{t('welcome.body')}</p>
        </div>
      {/if}
    </main>
    <FoldTab
      side="right"
      open={help}
      show={t('nav.showHelp')}
      hide={t('nav.hideHelp')}
      ontoggle={() => (help = !help)}
    />
  </div>

  {#if help}
    <aside class="help-column"><HelpPanel app="travel" locale={getLocale()} /></aside>
  {/if}
</div>

<Toasts />
<Dialogs />

<style>
  .app {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
  }

  .app.help {
    grid-template-columns: 260px minmax(0, 1fr) 320px;
  }

  /* A folded systems list gives its room to the main view. */
  .app.no-sidebar {
    grid-template-columns: minmax(0, 1fr);
  }

  .app.no-sidebar.help {
    grid-template-columns: minmax(0, 1fr) 320px;
  }

  .center {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  .center > main {
    flex: 1;
    min-width: 0;
  }

  .bar {
    display: flex;
    grid-column: 1 / -1;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-border);
  }

  .spacer {
    flex: 1;
  }

  .help-toggle {
    width: 32px;
    height: 32px;
    padding: 0;
    font-weight: 600;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .help-toggle:hover,
  .help-toggle.active {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  main {
    min-height: 0;
    padding: 18px calc(24px + var(--scroll-room)) 18px 24px;
    overflow: auto;
    scrollbar-gutter: stable;
  }

  .welcome {
    max-width: 640px;
    line-height: 1.6;
  }

  .welcome h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  .tagline {
    color: var(--accent);
  }

  .help-column {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px calc(10px + var(--scroll-room)) 10px 10px;
    overflow: auto;
    scrollbar-gutter: stable;
    background: var(--panel);
    border-left: 1px solid var(--panel-border);
  }

  @media (max-width: 800px) {
    .app,
    .app.help,
    .app.no-sidebar,
    .app.no-sidebar.help {
      grid-template-columns: 1fr;
    }

    .center > :global(.fold) {
      display: none;
    }
  }
</style>
