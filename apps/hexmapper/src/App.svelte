<script lang="ts">
  import { untrack } from 'svelte'
  import MapCanvas from './components/MapCanvas.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import { contextHelp, Dialogs, Toasts, tooltip } from '@open-tabletop/ui-kit'
  import { t } from './lib/i18n/index.svelte'
  import { editor } from './lib/store/editor.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import TopBar from './components/TopBar.svelte'
  import { startPersistence } from './lib/io/actions.svelte'
  import { startDeepLinks } from './lib/io/deepLinkSync.svelte'
  import { bindShortcuts } from './lib/shortcuts'

  let ready = $state(false)

  // A dotted label clicked: the side panel shows Help, on its explanation.
  $effect(() => {
    if (!contextHelp.asked) return
    untrack(() => {
      editor.panelView = 'help'
      editor.panelHidden = false
    })
  })
  // Its explanation closed: back to the tool's panel.
  $effect(() => {
    if (!contextHelp.closed) return
    untrack(() => {
      if (editor.panelView === 'help') editor.panelView = 'tool'
    })
  })
  $effect(() => {
    contextHelp.shown = editor.panelView === 'help' && !editor.panelHidden
  })

  $effect(() => {
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
      .then(keep)
    return () => {
      disposed = true
      unbind()
      for (const stop of stops) stop()
    }
  })
</script>

<div class="layout" class:hidden={editor.panelHidden}>
  <TopBar />
  <Toolbar />
  <main>
    {#if ready}
      <MapCanvas />
    {/if}
    <button
      class="fold"
      aria-expanded={!editor.panelHidden}
      aria-label={editor.panelHidden ? t('panel.show') : t('panel.hide')}
      use:tooltip={editor.panelHidden ? t('panel.show') : t('panel.hide')}
      onclick={() => (editor.panelHidden = !editor.panelHidden)}
      ><span aria-hidden="true">{editor.panelHidden ? '‹' : '›'}</span></button
    >
  </main>
  {#if !editor.panelHidden}<SidePanel />{/if}
</div>
<Toasts />
<Dialogs />

<style>
  .layout {
    display: grid;
    grid-template-columns: auto 1fr 300px;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
  }

  .layout :global(> header.bar) {
    grid-column: 1 / -1;
  }

  .layout.hidden {
    grid-template-columns: auto 1fr;
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

  /* Narrow windows: the panel becomes a sheet under the map. */
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: auto 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
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
    background: var(--canvas-bg);
  }
</style>
