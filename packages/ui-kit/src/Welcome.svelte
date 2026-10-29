<script lang="ts">
  import Markdown from './Markdown.svelte'

  /** What an app shows when nothing is open: its name, a line about it and a short text in Markdown. */
  let { title, tagline, body }: { title: string; tagline: string; body: string } = $props()
</script>

<div class="welcome">
  <h1>{title}</h1>
  <p class="tagline">{tagline}</p>
  <Markdown text={body} />
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
