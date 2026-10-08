<script lang="ts" module>
  export type LineIconName =
    'folder' | 'save' | 'map' | 'link' | 'brush' | 'fill' | 'eye' | 'eye-off' | 'lock' | 'unlock'
</script>

<script lang="ts">
  /** One-colour outline icons, matching the text glyphs of the toolbar (no colour emoji). */
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
