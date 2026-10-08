<script lang="ts">
  import { untrack } from 'svelte'
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
  import OraclePreferences from './components/OraclePreferences.svelte'
  import DefinitionView from './components/DefinitionView.svelte'
  import FileEditor from './components/FileEditor.svelte'
  import { History } from '@open-tabletop/oracle-ui'
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { importZip, UndoButtons } from '@open-tabletop/pack-ui'
  import NewDefinitionDialog from './components/NewDefinitionDialog.svelte'
  import NewPackDialog from './components/NewPackDialog.svelte'
  import { dialogs } from './lib/dialogs.svelte'
  import PackView from './components/PackView.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { getLocale, locales, setLocale, t } from './lib/i18n'
  import { go, nav } from './lib/nav.svelte'
  import { oracleUi } from './lib/oracle'
  import { workspace } from './lib/packs/workspace.svelte'
  import { manifestOf } from './lib/packs/workspace'
  import { isHidden } from './lib/hiddenPacks.svelte'
  import { systemOfPack, travelSystems } from '@open-tabletop/session'

  let creating = $state(false)

  // The system last chosen here, in Travel or in Systems: opened without a view, the Oracle
  // starts on its pack; a pack with a system chosen here becomes the last system.
  const systems = $derived(travelSystems(workspace.registry).systems)
  const lastPack = location.hash ? undefined : systems.find((s) => s.id === readLastSystem())?.pack
  const lastRoot = lastPack && !isHidden(lastPack) ? workspace.rootOf(lastPack) : undefined
  if (lastRoot) go({ name: 'pack', root: lastRoot }, true)
  $effect(() => {
    const view = nav.view
    const folder =
      view.name === 'pack' || view.name === 'file' ? workspace.pack(view.root) : undefined
    const pack = view.name === 'def' ? view.id.split('/')[0] : folder && manifestOf(folder).id
    const system = pack ? untrack(() => systemOfPack(systems, pack, readLastSystem())) : undefined
    if (system) rememberSystem(system.id)
  })

  async function importPacks() {
    const packs = await importZip(workspace, getLocale())
    // A system's file has its own pack first.
    if (packs?.length) go({ name: 'pack', root: packs[0].root })
  }

  const count = $derived(workspace.registry.definitions.size)

  /** Which side panels are open: a per-viewer preference, kept in this browser. */
  const LAYOUT = 'opentabletop.oracle.layout'
  function readLayout(): { sidebar: boolean; history: boolean } {
    try {
      const raw = JSON.parse(localStorage.getItem(LAYOUT) ?? '{}')
      return { sidebar: raw.sidebar !== false, history: raw.history !== false }
    } catch {
      return { sidebar: true, history: true }
    }
  }
  let layout = $state(readLayout())
  /** The right column shows the manual instead of the history. */
  let help = $state(false)
  // A dotted label clicked: the help column opens on its explanation.
  $effect(() => {
    if (!contextHelp.asked) return
    untrack(() => {
      help = true
      if (!layout.history) toggle('history')
    })
  })
  $effect(() => {
    contextHelp.shown = help && layout.history
  })
  function toggle(panel: 'sidebar' | 'history') {
    layout[panel] = !layout[panel]
    try {
      localStorage.setItem(LAYOUT, JSON.stringify(layout))
    } catch {
      // Not remembered; it still applies now.
    }
  }
</script>

<div class="app" class:no-sidebar={!layout.sidebar} class:no-history={!layout.history}>
  <header class="bar">
    <AppBrand app="oracle" name={t('app.title')} onclick={() => go({ name: 'welcome' })} />
    <AppSwitcher current="oracle" locale={getLocale()} />
    <div class="spacer"></div>
    <UndoButtons library={workspace} undoLabel={t('nav.undo')} redoLabel={t('nav.redo')} />
    <button onclick={() => (dialogs.newDefinition = {})}>{t('nav.newDefinition')}</button>
    <button onclick={() => (creating = true)}>{t('nav.newPack')}</button>
    <button use:tooltip={t('nav.importTip')} onclick={importPacks}>{t('nav.import')}</button>
    <PreferencesButton
      locale={getLocale()}
      {locales}
      onlocale={(locale) => setLocale(locale as 'en' | 'es')}
      title={t('app.title')}
    >
      <OraclePreferences />
    </PreferencesButton>
    <button
      class="help-toggle"
      class:active={help}
      aria-pressed={help}
      aria-label={t('nav.help')}
      use:tooltip={t('nav.help')}
      onclick={() => {
        help = !help
        if (help && !layout.history) toggle('history')
      }}>?</button
    >
  </header>

  <Sidebar />

  <div class="center">
    <FoldTab
      side="left"
      open={layout.sidebar}
      show={t('nav.showSidebar')}
      hide={t('nav.hideSidebar')}
      ontoggle={() => toggle('sidebar')}
    />
    <main>
      {#if nav.view.name === 'def'}
        <DefinitionView id={nav.view.id} tab={nav.view.tab} />
      {:else if nav.view.name === 'pack'}
        <PackView root={nav.view.root} />
      {:else if nav.view.name === 'file'}
        <FileEditor root={nav.view.root} path={nav.view.path} line={nav.view.line} />
      {:else}
        <div class="welcome">
          <h1>{t('welcome.title')}</h1>
          <p class="tagline">{t('app.tagline')}</p>
          <p>{t('welcome.body')}</p>
          <p class="muted">
            {t('welcome.packs', { packs: workspace.packs.length, definitions: count })}
          </p>
        </div>
      {/if}
    </main>
    <FoldTab
      side="right"
      open={layout.history}
      show={t(help ? 'nav.showHelp' : 'nav.showHistory')}
      hide={t(help ? 'nav.hideHelp' : 'nav.hideHistory')}
      ontoggle={() => toggle('history')}
    />
  </div>

  {#if help}
    <aside class="help-column"><HelpPanel app="oracle" locale={getLocale()} /></aside>
  {:else}
    <History ui={oracleUi} onopen={(item) => go({ name: 'def', id: item.source, tab: 'roll' })} />
  {/if}
</div>

{#if dialogs.newDefinition}
  <NewDefinitionDialog
    root={dialogs.newDefinition.root}
    onclose={() => (dialogs.newDefinition = null)}
  />
{/if}
{#if creating}
  <NewPackDialog onclose={() => (creating = false)} />
{/if}

<Toasts />
<Dialogs />

<style>
  .app {
    --sidebar: 280px;
    --history: 280px;

    display: grid;
    grid-template-columns: var(--sidebar) minmax(0, 1fr) var(--history);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
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

  .bar > button:not(.help-toggle) {
    padding: 5px 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .bar > button:not(.help-toggle):hover {
    border-color: var(--accent);
  }

  .spacer {
    flex: 1;
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
    font-size: 32px;
    font-weight: normal;
  }

  .tagline {
    margin-top: 0;
    color: var(--accent);
  }

  .muted {
    color: var(--text-muted);
  }

  /* Fixed columns, so a folded (hidden) panel doesn't shift the others. */
  .app > :global(.sidebar) {
    grid-column: 1;
  }

  .center {
    position: relative;
    display: flex;
    grid-column: 2;
    min-width: 0;
    min-height: 0;
  }

  .center > main {
    flex: 1;
    min-width: 0;
  }

  .app > :global(.history),
  .help-column {
    grid-column: 3;
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

  .app.no-history > .help-column {
    display: none;
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

  /* Folded side panels give their room to the main view. */
  .app.no-sidebar {
    --sidebar: 0px;
  }

  .app.no-sidebar > :global(.sidebar) {
    display: none;
  }

  .app.no-history {
    --history: 0px;
  }

  .app.no-history > :global(.history) {
    display: none;
  }

  @media (max-width: 1100px) {
    .app {
      --sidebar: 240px;
    }
  }

  /* Narrow windows: one column — the pack list, the definition, then history or help. */
  @media (max-width: 760px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto minmax(0, 1fr) auto;
    }

    .bar {
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 8px;
    }

    .bar > button:not(.help-toggle) {
      padding: 4px 8px;
      font-size: 13px;
    }

    .spacer {
      display: none;
    }

    .app > :global(.sidebar) {
      grid-row: 2;
      grid-column: 1;
      max-height: 32vh;
      border-right: none;
      border-bottom: 1px solid var(--panel-border);
    }

    .center {
      grid-row: 3;
      grid-column: 1;
    }

    main {
      padding: 12px;
    }

    .center > :global(.fold) {
      display: none;
    }

    .app > :global(.history),
    .help-column {
      grid-row: 4;
      grid-column: 1;
      max-height: 38vh;
      border-left: none;
      border-top: 1px solid var(--panel-border);
    }
  }
</style>
