<script lang="ts">
  import type { Snippet } from 'svelte'
  import AppBrand from './AppBrand.svelte'
  import AppSwitcher from './AppSwitcher.svelte'
  import type { AppId } from './apps'
  import { contextHelp } from './contextHelp.svelte'
  import FoldTab from './FoldTab.svelte'
  import PreferencesButton from './PreferencesButton.svelte'
  import { tooltip } from './tooltip'

  /**
   * The frame of an app with a list on the left: a top bar (brand, app switcher, language,
   * help), the list (foldable, remembered in this browser), the main view and the help column.
   */
  let {
    app,
    name,
    locale,
    locales,
    onlocale,
    onhome,
    texts,
    sidebar,
    bar,
    help,
    children,
  }: {
    app: AppId
    /** The app's title in the brand. */
    name: string
    locale: string
    locales: Record<string, string>
    onlocale: (locale: string) => void
    /** The brand clicked. */
    onhome: () => void
    texts: {
      help: string
      showSidebar: string
      hideSidebar: string
      showHelp: string
      hideHelp: string
    }
    /** The left list (a `Sidebar`). */
    sidebar: Snippet
    /** Extra buttons in the top bar, before the language. */
    bar?: Snippet
    /** The help column's content (the app's manual panel). */
    help: Snippet
    children: Snippet
  } = $props()

  let helpOpen = $state(false)
  /** Whether the list is shown: a per-viewer preference, kept in this browser. */
  const LAYOUT = $derived(`opentabletop.${app}.layout`)
  function readSidebar(key: string): boolean {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}').sidebar !== false
    } catch {
      return true
    }
  }
  // svelte-ignore state_referenced_locally
  let showSidebar = $state(readSidebar(`opentabletop.${app}.layout`))
  function toggleSidebar() {
    showSidebar = !showSidebar
    try {
      localStorage.setItem(LAYOUT, JSON.stringify({ sidebar: showSidebar }))
    } catch {
      // Not remembered; it still applies now.
    }
  }
  // A dotted label clicked: the help column opens on its explanation.
  $effect(() => {
    if (contextHelp.asked) helpOpen = true
  })
  $effect(() => {
    contextHelp.shown = helpOpen
  })
</script>

<div class="app" class:help={helpOpen} class:no-sidebar={!showSidebar}>
  <header class="bar">
    <AppBrand {app} {name} onclick={onhome} />
    <AppSwitcher current={app} {locale} />
    <div class="spacer"></div>
    {@render bar?.()}
    <PreferencesButton {locale} {locales} {onlocale} />
    <button
      class="help-toggle"
      class:active={helpOpen}
      aria-pressed={helpOpen}
      aria-label={texts.help}
      use:tooltip={texts.help}
      onclick={() => (helpOpen = !helpOpen)}>?</button
    >
  </header>

  {#if showSidebar}{@render sidebar()}{/if}

  <div class="center">
    <FoldTab
      side="left"
      open={showSidebar}
      show={texts.showSidebar}
      hide={texts.hideSidebar}
      ontoggle={toggleSidebar}
    />
    <main>{@render children()}</main>
    <FoldTab
      side="right"
      open={helpOpen}
      show={texts.showHelp}
      hide={texts.hideHelp}
      ontoggle={() => (helpOpen = !helpOpen)}
    />
  </div>

  {#if helpOpen}
    <aside class="help-column">{@render help()}</aside>
  {/if}
</div>

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

  /* A folded list gives its room to the main view. */
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
