<script lang="ts">
  import MapCanvas from './components/MapCanvas.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import Dialog from './components/Dialog.svelte'
  import Toasts from './components/Toasts.svelte'
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

<div class="layout">
  <Toolbar />
  <main>
    {#if ready}
      <MapCanvas />
    {/if}
  </main>
  <SidePanel />
</div>
<Toasts />
<Dialog />

<style>
  .layout {
    display: grid;
    grid-template-columns: auto 1fr 300px;
    height: 100%;
  }

  main {
    position: relative;
    min-width: 0;
    background: var(--canvas-bg);
  }
</style>
