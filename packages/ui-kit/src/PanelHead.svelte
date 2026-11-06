<script lang="ts">
  import InfoTip from './InfoTip.svelte'
  import { tooltip } from './tooltip'

  /**
   * The head of a side panel, alike in all of them: its title, what explains it (`help`, in
   * Markdown) and, for a panel that opens over another, ✕ to go back (`onclose`, named by
   * `closeLabel`).
   */
  let {
    title,
    help = '',
    closeLabel = '',
    onclose,
  }: { title: string; help?: string; closeLabel?: string; onclose?: () => void } = $props()
</script>

<header class="panel-head">
  <h1>
    {title}{#if help}<InfoTip markdown={help} />{/if}
  </h1>
  {#if onclose}
    <button use:tooltip={closeLabel} aria-label={closeLabel} onclick={onclose}>✕</button>
  {/if}
</header>

<style>
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--panel-border);
  }

  h1 {
    margin: 0;
    font-size: 16px;
    color: var(--accent);
  }

  button {
    padding: 2px 8px;
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    color: var(--text);
    border-color: var(--panel-border);
  }
</style>
