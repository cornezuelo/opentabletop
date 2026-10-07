<script lang="ts">
  import { renderMarkdown } from './markdown'

  /** A pack text (a description…) with basic Markdown: paragraphs, **bold**, `code`, lists. */
  let { text, class: className = '' }: { text: string; class?: string } = $props()
  const html = $derived(renderMarkdown(text))
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by renderMarkdown -->
<div class="markdown {className}">{@html html}</div>

<style>
  /* Room between lines, so code chips on one line never touch the next. */
  .markdown {
    line-height: 1.65;
  }

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

  /* Ids, values and YAML stand out as small, quiet chips. */
  .markdown :global(code) {
    margin: 0 0.1em;
    padding: 0.1em 0.35em;
    font-family: ui-monospace, monospace;
    font-size: 0.88em;
    line-height: 1;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    color: color-mix(in srgb, var(--text) 80%, var(--accent));
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .markdown :global(strong) {
    color: var(--text);
  }

  .markdown :global(a) {
    color: var(--accent);
  }
</style>
