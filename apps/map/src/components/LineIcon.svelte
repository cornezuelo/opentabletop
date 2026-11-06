<script lang="ts" module>
  export type LineIconName =
    | 'folder'
    | 'save'
    | 'map'
    | 'link'
    | 'brush'
    | 'fill'
    | 'eye'
    | 'eye-off'
    | 'lock'
    | 'unlock'
    | 'fit'
    | 'region'
    | 'select'
    | 'terrain'
    | 'path'
    | 'connection'
    | 'wall'
    | 'icon'
    | 'text'
    | 'token'
    | 'trip'
    | 'world'
    | 'undo'
    | 'redo'
    | 'new'
    | 'minus'
    | 'export'
    | 'layers'
    | 'tree'
    | 'help'
</script>

<script lang="ts">
  /** One-colour outline icons, one set for the bars (no colour emoji). */
  let { name }: { name: LineIconName } = $props()
</script>

<svg viewBox="0 0 24 24" aria-hidden="true">
  {#if name === 'folder'}
    <path
      d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4.4l2 2.2h8.6a1.5 1.5 0 0 1 1.5 1.5v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"
    />
  {:else if name === 'save'}
    <path d="M4.5 3.5h12l3 3v13a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" />
    <path d="M8 3.5v5h7v-5M7.5 20.5v-6.5h9v6.5" />
  {:else if name === 'map'}
    <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
    <path d="M9 4.5v13M15 6.5v13" />
  {:else if name === 'brush'}
    <path d="M20 4 10.5 13.5" />
    <path d="M10.5 13.5c-2.5-.5-4.5 1-4.5 3.5 0 1.3-.7 2.3-2 3 3.5.8 7.5 0 7.9-3.4z" />
  {:else if name === 'fill'}
    <path d="m11 4 7 7-6.5 6.5a1.4 1.4 0 0 1-2 0l-5-5a1.4 1.4 0 0 1 0-2z" />
    <path d="M5.5 11.5h12.5M19.5 15s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z" />
  {:else if name === 'eye' || name === 'eye-off'}
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
    {#if name === 'eye-off'}<path d="M4 20 20 4" />{/if}
  {:else if name === 'lock' || name === 'unlock'}
    <rect x="5" y="11" width="14" height="9.5" rx="1.5" />
    <path d={name === 'lock' ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.7-1.5'} />
  {:else if name === 'fit'}
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
    <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
    <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
  {:else if name === 'region'}
    <path d="M4.5 8.5 9 4l6.5 2 4 5-2 7.5-7 2-5.5-4z" stroke-dasharray="2.6 2.2" />
    <circle cx="11.5" cy="12" r="1.6" />
  {:else if name === 'select'}
    <path d="M5.5 3.5v14.5l4-3.5 2.6 6 2.8-1.2-2.6-6h5.2z" />
  {:else if name === 'terrain'}
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
  {:else if name === 'path'}
    <path d="M3 16c3-6.5 5-6.5 8-2s5.5 4.5 10-4" />
  {:else if name === 'connection'}
    <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />
  {:else if name === 'wall'}
    <rect x="3.5" y="5" width="17" height="14" rx="1" />
    <path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 5v4.7M12 9.7v4.6M9 14.3V19M15 14.3V19" />
  {:else if name === 'icon'}
    <path d="M6 20.5h12M7.5 20.5l1-9h7l1 9M6.5 11.5V5H9v2h2V5h2v2h2V5h2.5v6.5z" />
  {:else if name === 'text'}
    <path d="M5 7V4.5h14V7M12 4.5v15M9.5 19.5h5" />
  {:else if name === 'token'}
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M9.5 12.5 8 19h8l-1.5-6.5M6.5 20.5h11" />
  {:else if name === 'trip'}
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  {:else if name === 'world'}
    <path d="M19.5 14.5a8 8 0 0 1-10-10 8 8 0 1 0 10 10z" />
  {:else if name === 'undo'}
    <path d="M8 5 4 9l4 4M4 9h10a5.5 5.5 0 0 1 0 11h-3" />
  {:else if name === 'redo'}
    <path d="m16 5 4 4-4 4M20 9H10a5.5 5.5 0 0 0 0 11h3" />
  {:else if name === 'new'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'minus'}
    <path d="M5 12h14" />
  {:else if name === 'export'}
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  {:else if name === 'layers'}
    <path d="m12 4-8.5 4.5L12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16 12 20.5l8.5-4.5" />
  {:else if name === 'tree'}
    <path d="M9 3.5h6v5H9zM3.5 15.5h6v5h-6zM14.5 15.5h6v5h-6zM12 8.5V12M6.5 15.5V12h11v3.5" />
  {:else if name === 'help'}
    <path d="M9 9.5a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18v.01" />
  {:else}
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  {/if}
</svg>

<style>
  svg {
    width: 1.15em;
    height: 1.15em;
    vertical-align: -0.2em;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
