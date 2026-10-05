<script lang="ts">
  import { Application } from 'pixi.js'

  let container: HTMLDivElement
  let canvas: HTMLCanvasElement

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
        if (destroyed) app.destroy()
      })

    return () => {
      destroyed = true
      if (ready) app.destroy()
    }
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
  }
</style>
