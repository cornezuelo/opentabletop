<script lang="ts">
  import { AppBrand, AppSwitcher, showToast, Toasts, tooltip } from '@open-tabletop/ui-kit'
  import DefinitionView from './components/DefinitionView.svelte'
  import FileEditor from './components/FileEditor.svelte'
  import { History } from '@open-tabletop/oracle-ui'
  import { HelpPanel } from '@open-tabletop/manual-ui'
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
  import { zipToPack } from './lib/packs/zip'

  let creating = $state(false)

  async function importZip() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const pack = zipToPack(new Uint8Array(await file.arrayBuffer()))
        if (!pack) return showToast(t('import.noManifest'), 'error')
        const existing = workspace.pack(pack.root)
        if (existing?.origin === 'user' && !confirm(t('import.replace', { pack: pack.root })))
          return
        workspace.addPack(pack)
        showToast(
          t('import.done', { pack: manifestOf(pack).name ?? pack.root, count: pack.files.length }),
        )
        go({ name: 'pack', root: pack.root })
      } catch (error) {
        showToast(t('import.failed', { message: (error as Error).message }), 'error')
      }
    }
    input.click()
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
    <button
      class="panel-toggle"
      aria-pressed={layout.sidebar}
      aria-label={t('nav.toggleSidebar')}
      use:tooltip={t('nav.toggleSidebar')}
      onclick={() => toggle('sidebar')}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"
        ><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><rect
          class="fill"
          x="1.5"
          y="2.5"
          width="4.5"
          height="11"
          rx="1.5"
        /></svg
      >
    </button>
    <AppBrand app="oracle" name={t('app.title')} onclick={() => go({ name: 'welcome' })} />
    <AppSwitcher current="oracle" locale={getLocale()} />
    <div class="spacer"></div>
    <button onclick={() => (dialogs.newDefinition = {})}>{t('nav.newDefinition')}</button>
    <button onclick={() => (creating = true)}>{t('nav.newPack')}</button>
    <button use:tooltip={t('nav.importTip')} onclick={importZip}>{t('nav.import')}</button>
    <select
      aria-label={t('nav.language')}
      value={getLocale()}
      onchange={(e) => setLocale(e.currentTarget.value as 'en' | 'es')}
    >
      {#each Object.entries(locales) as [code, name] (code)}
        <option value={code}>{name}</option>
      {/each}
    </select>
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
    <button
      class="panel-toggle"
      aria-pressed={layout.history}
      aria-label={t('nav.toggleHistory')}
      use:tooltip={t('nav.toggleHistory')}
      onclick={() => toggle('history')}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"
        ><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><rect
          class="fill"
          x="10"
          y="2.5"
          width="4.5"
          height="11"
          rx="1.5"
        /></svg
      >
    </button>
  </header>

  <Sidebar />

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

  .bar > button {
    padding: 5px 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .bar > button:hover {
    border-color: var(--accent);
  }

  .spacer {
    flex: 1;
  }

  main {
    min-height: 0;
    padding: 18px 24px;
    overflow: auto;
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

  main {
    grid-column: 2;
  }

  .app > :global(.history),
  .help-column {
    grid-column: 3;
  }

  .help-column {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px;
    overflow: auto;
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

  .panel-toggle {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .panel-toggle:hover {
    color: var(--text);
    border-color: var(--panel-border);
  }

  .panel-toggle svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .panel-toggle svg .fill {
    fill: currentColor;
    opacity: 0.25;
  }

  .panel-toggle[aria-pressed='true'] svg .fill {
    opacity: 0.8;
  }

  @media (max-width: 1100px) {
    .app {
      --sidebar: 240px;
      --history: 0px;
    }

    .app > :global(.history) {
      display: none;
    }

    .app.no-sidebar {
      --sidebar: 0px;
    }
  }
</style>
