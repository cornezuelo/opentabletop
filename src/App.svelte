<script lang="ts">
  import MapCanvas from './components/MapCanvas.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import Toolbar from './components/Toolbar.svelte'
</script>

<div class="layout">
  <Toolbar />
  <main>
    <MapCanvas />
  </main>
  <SidePanel />
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: auto 1fr 320px;
    height: 100%;
  }

  main {
    position: relative;
    min-width: 0;
    background: var(--canvas-bg);
  }
</style>
