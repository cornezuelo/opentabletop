<script lang="ts">
  import { renderInline } from './markdown'

  /**
   * A short pack text shown inline (a result, a card, a line of play): **bold**, _italics_,
   * `code` and styled spans (`[text]{red underline}`) drawn, never HTML. Long texts with
   * paragraphs and lists are `Markdown`'s.
   */
  let { text }: { text: string } = $props()
  const html = $derived(renderInline(text))
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by renderInline -->
<span class="styled">{@html html}</span>

<style>
  .styled :global(code) {
    padding: 0 0.3em;
    font-family: ui-monospace, monospace;
    font-size: 0.88em;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .styled :global(a) {
    color: var(--accent);
  }
</style>
