<script lang="ts">
  import { tooltip } from '../lib/ui/tooltip'

  /** Small "i" badge that explains the control next to it. */
  let { text }: { text: string } = $props()
</script>

{#if text}
  <button type="button" class="info" aria-label={text} use:tooltip={text}>i</button>
{/if}

<style>
  .info {
    display: inline-grid;
    padding: 0;
    border: none;
    place-items: center;
    width: 15px;
    height: 15px;
    margin-left: 4px;
    font:
      italic 600 10px/1 Georgia,
      serif;
    color: var(--panel);
    vertical-align: 2px;
    background: var(--text-muted);
    border-radius: 50%;
    cursor: help;
    user-select: none;
  }

  .info:hover,
  .info:focus-visible {
    background: var(--accent);
    outline: none;
  }
</style>
