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
    // Pixi only follows the window's size: a column opening or folding beside the map
    // (the help, the side panel, the tools) changes the container's.
    const observer = new ResizeObserver(() => ready && !destroyed && app.queueResize())
    observer.observe(container)

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
        view.exportCanvas = (options) => renderer!.exportCanvas(options)
        view.exportBounds = () => renderer!.exportBounds()
        view.centerOn = (cell) => renderer?.centerOn(cell)
        view.centerOnPoint = (p) => renderer?.centerOnPoint(p)
        if (view.pendingCenter) renderer.centerOn(view.pendingCenter)
        view.pendingCenter = null
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
      observer.disconnect()
      view.fit = () => {}
      view.centerOnPoint = () => {}
      view.exportCanvas = null
      view.exportBounds = null
      view.centerOn = (cell) => {
        view.pendingCenter = cell
      }
      renderer?.destroy()
      renderer = null
      if (ready) app.destroy()
    }
  })

  // Redraw outlines when UI state that affects them changes.
  $effect(() => {
    void [
      editor.selected,
      editor.selectedLabel,
      editor.tool,
      editor.terrainMode,
      editor.brushRadius,
      editor.pathDraft,
      editor.pathStraight,
    ]
    renderer?.drawOverlay()
  })

  // Hexes with the highlighted tag.
  $effect(() => {
    void [editor.highlightTag, editor.highlightDim]
    renderer?.drawHighlight()
  })

  // The selected token is ringed.
  $effect(() => {
    void editor.selectedToken
    renderer?.drawTokens()
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
