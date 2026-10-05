<script lang="ts">
  import MapCanvas from './components/MapCanvas.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import Toasts from './components/Toasts.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import { startAutosave } from './lib/io/actions'
  import { bindShortcuts } from './lib/shortcuts'

  let ready = $state(false)

  $effect(() => {
    const unbind = bindShortcuts()
    let stopAutosave: (() => void) | undefined
    let disposed = false
    startAutosave().then((stop) => {
      if (disposed) stop()
      else stopAutosave = stop
      ready = true
    })
    return () => {
      disposed = true
      unbind()
      stopAutosave?.()
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
