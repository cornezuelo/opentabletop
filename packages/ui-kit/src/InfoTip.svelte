<script lang="ts">
  import { markdownText } from './markdown'
  import { showTooltip, tooltip } from './tooltip'

  /**
   * Small "i" badge that explains the control next to it. Not a <button>: inside a
   * <label> a button would become the labelled control instead of the field, and a
   * click on it must not toggle the label's checkbox. Tapping or Enter shows the text.
   */
  let { text = '', markdown = '' }: { text?: string; markdown?: string } = $props()
  /** `markdown`: a pack's text (description…), shown with its formatting. */
  const content = $derived(markdown ? { markdown } : text)
  const label = $derived(markdown ? markdownText(markdown) : text)

  function open(event: Event) {
    event.preventDefault()
    showTooltip(event.currentTarget as HTMLElement, content)
  }
</script>

{#if text || markdown}
  <span
    class="info"
    role="button"
    tabindex="0"
    aria-label={label}
    use:tooltip={content}
    onclick={open}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && open(e)}>i</span
  >
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
