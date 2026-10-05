<script lang="ts">
  import { Application } from 'pixi.js'
  import { MapRenderer } from '../lib/render/MapRenderer'
  import { editor } from '../lib/store/editor.svelte'
  import { view } from '../lib/store/view'
  import { finishPath } from '../lib/tools/tools'

  let container: HTMLDivElement
  let canvas: HTMLCanvasElement
  let renderer = $state<MapRenderer | null>(null)

  $effect(() => {
    const app = new Application()
    let ready = false
    let destroyed = false

    app
      .init({
        canvas,
        resizeTo: container,
        background: getComputedStyle(container).getPropertyValue('--canvas-bg').trim(),
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      })
      .then(() => {
        ready = true
        if (destroyed) return app.destroy()
        renderer = new MapRenderer(app, canvas)
        view.fit = () => renderer?.fit()
        // Dev-only hook for browser tests: map world points to screen coordinates.
        if (import.meta.env.DEV)
          Object.assign(window, {
            __hexmapper: {
              editor,
              worldToScreen: (p: { x: number; y: number }) => renderer?.worldToScreen(p),
            },
          })
      })

    return () => {
      destroyed = true
      view.fit = () => {}
      renderer?.destroy()
      renderer = null
      if (ready) app.destroy()
    }
  })

  // Redraw outlines when UI state that affects them changes.
  $effect(() => {
    void [
      editor.selected,
      editor.tool,
      editor.terrainMode,
      editor.brushRadius,
      editor.pathDraft,
      editor.pathStraight,
    ]
    renderer?.drawOverlay()
  })

  // Leaving the path tool keeps what was drawn instead of discarding it.
  $effect(() => {
    if (editor.tool !== 'path') finishPath()
  })
</script>

<div class="canvas" bind:this={container}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .canvas {
    position: absolute;
    inset: 0;
  }

  canvas {
    display: block;
    touch-action: none;
  }
</style>
