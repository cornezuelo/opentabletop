<script lang="ts">
  import { untrack } from 'svelte'
  import { MediaQuery } from 'svelte/reactivity'
  import MapCanvas from './components/MapCanvas.svelte'
  import MapBar from './components/MapBar.svelte'
  import MapWelcome from './components/MapWelcome.svelte'
  import PlayStrip from './components/PlayStrip.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import {
    contextHelp,
    Dialogs,
    FoldTab,
    ResizeHandle,
    Toasts,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { HelpPanel } from '@open-tabletop/manual-ui'
  import { getLocale, t } from './lib/i18n/index.svelte'
  import { editor } from './lib/store/editor.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import TopBar from './components/TopBar.svelte'
  import { library, startPersistence } from './lib/io/actions.svelte'
  import { startDeepLinks } from './lib/io/deepLinkSync.svelte'
  import { bindShortcuts } from './lib/shortcuts'
  import { PANEL_WIDTH, panelWidth, setPanelWidth } from './lib/store/panelWidth.svelte'
  import { roster } from '@open-tabletop/character-ui'
  import { pullMap } from './lib/play/roster'
  import { loadLinks } from './lib/io/submaps'

  let ready = $state(false)
  /** The first run of what opens the floating panel: nothing has been asked of it yet. */
  let started = false
  /** The link in the URL is open, so an empty map is really what's in front of the player. */
  let linksFollowed = $state(false)

  // A dotted label clicked: the help column opens on its explanation.
  $effect(() => {
    if (!contextHelp.asked) return
    untrack(() => (editor.helpOpen = true))
  })
  $effect(() => {
    contextHelp.shown = editor.helpOpen
  })

  // Once: starting reads state (the campaign played), and mustn't start again when it changes.
  $effect(() =>
    untrack(() => {
      const unbind = bindShortcuts()
      const stops: (() => void)[] = []
      let disposed = false
      const keep = (stop: () => void) => (disposed ? stop() : stops.push(stop))
      startPersistence()
        .then((stop) => {
          keep(stop)
          ready = true
          return startDeepLinks()
        })
        .then((stop) => {
          keep(stop)
          linksFollowed = true
        })
      return () => {
        disposed = true
        unbind()
        for (const stop of stops) stop()
      }
    }),
  )

  // A window too narrow for map and panel side by side: the panel floats, folded until there's
  // something for it to show (a tool, a panel, a cell).
  const floating = new MediaQuery('max-width: 1100px')
  untrack(() => {
    if (floating.current) editor.panelHidden = true
  })
  $effect.pre(() => {
    void [editor.tool, editor.panelView, editor.mode]
    const asked = !!editor.selected
    untrack(() => {
      if (!floating.current) return
      if (asked || started) editor.panelHidden = false
      started = true
    })
  })

  // Another map opened, or this one now hangs elsewhere: the maps it reaches are read again.
  $effect(() => {
    void [editor.meta.id, editor.meta.parent?.map, ready, library.links]
    if (ready) untrack(() => void loadLinks())
  })

  // The roster changed (the Characters app, another tab): the map's characters catch up.
  $effect(() => {
    void roster.roster
    untrack(() => pullMap())
  })
</script>

<div
  class="layout"
  class:hidden={editor.panelHidden}
  class:with-help={editor.helpOpen}
  class:sheet-full={editor.sheetFull}
  style:--panel-width={`${panelWidth.value}px`}
>
  <TopBar />
  {#if !editor.toolsHidden}<Toolbar />{:else}<span aria-hidden="true"></span>{/if}
  <main>
    {#if ready}
      <MapCanvas />
      <MapBar />
    {/if}
    {#if linksFollowed}<MapWelcome />{/if}
    <PlayStrip />
    {#if !editor.panelHidden}
      <div class="edge">
        <ResizeHandle
          value={panelWidth.value}
          {...PANEL_WIDTH}
          label={t('panel.width')}
          onchange={setPanelWidth}
        />
      </div>
    {/if}
    <FoldTab
      side="left"
      open={!editor.toolsHidden}
      show={t('tools.show')}
      hide={t('tools.hide')}
      ontoggle={() => (editor.toolsHidden = !editor.toolsHidden)}
    />
    <button
      class="fold"
      aria-expanded={!editor.panelHidden}
      aria-label={editor.panelHidden ? t('panel.show') : t('panel.hide')}
      use:tooltip={editor.panelHidden ? t('panel.show') : t('panel.hide')}
      onclick={() => (editor.panelHidden = !editor.panelHidden)}
      ><span aria-hidden="true">{editor.panelHidden ? '‹' : '›'}</span></button
    >
    {#if !editor.panelHidden}
      <button
        class="grow"
        aria-pressed={editor.sheetFull}
        aria-label={t('panel.grow')}
        use:tooltip={t('panel.grow')}
        onclick={() => (editor.sheetFull = !editor.sheetFull)}
        ><span aria-hidden="true">{editor.sheetFull ? '▾' : '▴'}</span></button
      >
    {/if}
  </main>
  {#if !editor.panelHidden}<SidePanel />{/if}
  {#if editor.helpOpen}
    <aside class="help-column"><HelpPanel app="map" locale={getLocale()} /></aside>
  {/if}
</div>
<Toasts />
<Dialogs />

<style>
  .layout {
    display: grid;
    grid-template-columns: auto 1fr var(--panel-width);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
  }

  .layout :global(> header.bar) {
    grid-column: 1 / -1;
  }

  .layout.hidden {
    grid-template-columns: auto 1fr;
  }

  .layout.with-help {
    grid-template-columns: auto 1fr var(--panel-width) 320px;
  }

  .layout.hidden.with-help {
    grid-template-columns: auto 1fr 320px;
  }

  .help-column {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px calc(10px + var(--scroll-room, 0px)) 10px 10px;
    overflow: auto;
    scrollbar-gutter: stable;
    background: var(--panel);
    border-left: 1px solid var(--panel-border);
  }

  /* The panel's left edge, dragged to widen it. */
  .edge {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  .fold {
    position: absolute;
    top: 50%;
    right: 0;
    z-index: 2;
    width: 18px;
    height: 48px;
    padding: 0;
    font-size: 16px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-right: none;
    border-radius: 6px 0 0 6px;
    transform: translateY(-50%);
    cursor: pointer;
  }

  .fold:hover {
    color: var(--accent);
  }

  .grow {
    display: none;
  }

  /* Too narrow for both: the panel floats over the map, its tab beside it. */
  @media (min-width: 761px) and (max-width: 1100px) {
    .layout,
    .layout.with-help {
      position: relative;
      grid-template-columns: auto 1fr;
    }

    .layout :global(> aside.panel) {
      position: absolute;
      top: var(--bar-height, 45px);
      right: 0;
      bottom: 0;
      z-index: 3;
      width: var(--panel-width);
      box-shadow: -6px 0 16px rgb(0 0 0 / 35%);
    }

    .layout:not(.hidden) .fold {
      right: var(--panel-width);
    }

    /* What stands over the map keeps clear of the panel. */
    .layout:not(.hidden) main {
      --map-covered: var(--panel-width);
    }

    .edge {
      display: none;
    }

    .help-column {
      position: absolute;
      top: var(--bar-height, 45px);
      right: 0;
      bottom: 0;
      z-index: 4;
      width: 320px;
    }
  }

  /* Narrow windows: the panel becomes a sheet under the map, half the window or most of it. */
  @media (max-width: 760px) {
    .edge {
      display: none;
    }

    .grow {
      position: absolute;
      right: calc(50% + 28px);
      bottom: 0;
      z-index: 2;
      display: block;
      width: 48px;
      height: 18px;
      padding: 0;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
    }

    .layout.sheet-full :global(> aside.panel) {
      max-height: 85vh;
    }

    .layout {
      grid-template-columns: auto 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
    }

    .layout.with-help,
    .layout.hidden.with-help {
      grid-template-columns: auto 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
    }

    .help-column {
      grid-column: 2;
      max-height: 45vh;
      border-top: 1px solid var(--panel-border);
      border-left: none;
    }

    .layout :global(> aside.panel) {
      grid-column: 2;
      max-height: 45vh;
      border-top: 1px solid var(--panel-border);
      border-left: none;
    }

    .layout :global(> nav),
    .layout :global(> .toolbar) {
      grid-row: 2 / span 2;
    }

    .fold {
      top: auto;
      right: 50%;
      bottom: 0;
      width: 48px;
      height: 18px;
      border: 1px solid var(--panel-border);
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      transform: translateX(50%);
    }

    .fold span {
      display: inline-block;
      transform: rotate(90deg);
    }
  }

  main {
    position: relative;
    min-width: 0;
    overflow: hidden;
    background: var(--canvas-bg);
  }
</style>
