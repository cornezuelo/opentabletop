<script lang="ts">
  import { renderMarkdown } from './markdown'

  /** A pack text (a description…) with basic Markdown: paragraphs, **bold**, `code`, lists. */
  let { text, class: className = '' }: { text: string; class?: string } = $props()
  const html = $derived(renderMarkdown(text))
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by renderMarkdown -->
<div class="markdown {className}">{@html html}</div>

<style>
  .markdown :global(p),
  .markdown :global(ul),
  .markdown :global(ol),
  .markdown :global(blockquote) {
    margin: 0 0 0.5em;
  }

  .markdown :global(:last-child) {
    margin-bottom: 0;
  }

  .markdown :global(ul),
  .markdown :global(ol) {
    padding-left: 1.3em;
  }

  .markdown :global(blockquote) {
    padding-left: 0.7em;
    border-left: 2px solid var(--panel-border);
  }

  /* Ids, values and YAML stand out as small chips in the accent colour. */
  .markdown :global(code) {
    padding: 0.05em 0.4em;
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    border-radius: 4px;
  }

  .markdown :global(strong) {
    color: var(--text);
  }

  .markdown :global(a) {
    color: var(--accent);
  }
</style>
