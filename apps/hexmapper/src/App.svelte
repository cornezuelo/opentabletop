<script lang="ts">
  import MapCanvas from './components/MapCanvas.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import { Dialogs, Toasts, tooltip } from '@open-tabletop/ui-kit'
  import { t } from './lib/i18n/index.svelte'
  import { editor } from './lib/store/editor.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import { startPersistence } from './lib/io/actions.svelte'
  import { startDeepLinks } from './lib/io/deepLinkSync.svelte'
  import { bindShortcuts } from './lib/shortcuts'

  let ready = $state(false)

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

<!-- Like the other apps: the panel on the left, the map, then the tools on the right. -->
<div class="layout" class:hidden={editor.panelHidden}>
  {#if !editor.panelHidden}<SidePanel />{/if}
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
      ><span aria-hidden="true">{editor.panelHidden ? '›' : '‹'}</span></button
    >
  </main>
  <Toolbar />
</div>
<Toasts />
<Dialogs />

<style>
  .layout {
    display: grid;
    grid-template-columns: 300px 1fr auto;
    height: 100%;
  }

  .layout.hidden {
    grid-template-columns: 1fr auto;
  }

  .fold {
    position: absolute;
    top: 50%;
    left: 0;
    z-index: 2;
    width: 18px;
    height: 48px;
    padding: 0;
    font-size: 16px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-left: none;
    border-radius: 0 6px 6px 0;
    transform: translateY(-50%);
    cursor: pointer;
  }

  .fold:hover {
    color: var(--accent);
  }

  /* Narrow windows: the panel becomes a sheet under the map. */
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr auto;
      grid-template-rows: minmax(0, 1fr) auto;
    }

    .layout main {
      grid-column: 1;
      grid-row: 1;
    }

    .layout :global(> aside.panel) {
      grid-column: 1;
      grid-row: 2;
      max-height: 45vh;
      border-top: 1px solid var(--panel-border);
      border-right: none;
    }

    .layout :global(> nav),
    .layout :global(> .toolbar) {
      grid-column: 2;
      grid-row: 1 / span 2;
    }

    .fold {
      top: auto;
      left: 50%;
      bottom: 0;
      width: 48px;
      height: 18px;
      border: 1px solid var(--panel-border);
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      transform: translateX(-50%);
    }

    .fold span {
      display: inline-block;
      transform: rotate(-90deg);
    }
  }

  main {
    position: relative;
    min-width: 0;
    background: var(--canvas-bg);
  }
</style>
