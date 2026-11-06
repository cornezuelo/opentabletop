<script lang="ts">
  import type { Snippet } from 'svelte'
  import Markdown from './Markdown.svelte'

  /**
   * What an app shows when nothing is open: its name, a line about it, a short text in Markdown
   * and what it offers to start with (`children`).
   */
  let {
    title,
    tagline,
    body,
    children,
  }: { title: string; tagline: string; body: string; children?: Snippet } = $props()
</script>

<div class="welcome">
  <h1>{title}</h1>
  <p class="tagline">{tagline}</p>
  <Markdown text={body} />
  {@render children?.()}
</div>

<style>
  .welcome {
    max-width: 640px;
    line-height: 1.6;
  }

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  .tagline {
    color: var(--accent);
  }
</style>
