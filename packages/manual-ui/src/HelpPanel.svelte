<script lang="ts">
  import { appUrl, contextHelp, helpMarkdown, Markdown } from '@open-tabletop/ui-kit'
  import { textFor } from './i18n'
  import { manual } from './manual'
  import PageView from './PageView.svelte'
  import SearchResults from './SearchResults.svelte'

  /** The manual of one app, small enough for a side panel, with search. */
  let { app, locale }: { app: string; locale: string } = $props()

  const text = $derived(textFor(locale))
  const pages = $derived(manual.pages(app, locale))
  let query = $state('')
  let slug = $state<string | undefined>(undefined)
  let anchor = $state<string | undefined>(undefined)
  const page = $derived(pages.find((p) => p.slug === slug) ?? pages[0])
  const results = $derived(query.trim() ? manual.search(query, locale, app) : [])

  function open(nextApp: string, nextSlug: string, nextAnchor?: string) {
    if (nextApp !== app) {
      window.open(
        `${appUrl('manual')}#/${nextApp}/${nextSlug}${nextAnchor ? `/${nextAnchor}` : ''}`,
      )
      return
    }
    query = ''
    slug = nextSlug
    anchor = nextAnchor
  }
</script>

<div class="help">
  <!-- The control being explained (a dotted label clicked, or the field with focus): only
       its explanation, the manual a click away. -->
  {#if contextHelp.entry}
    {@const entry = contextHelp.entry}
    <section class="context" aria-live="polite">
      <header>
        <strong>{entry.title}</strong>
        <button
          class="close"
          aria-label={text.contextClose}
          onclick={() => (contextHelp.entry = null)}>✕</button
        >
      </header>
      <Markdown text={entry.markdown ?? helpMarkdown(entry.text ?? '')} />
    </section>
    <div class="context-actions">
      <button onclick={() => (contextHelp.entry = null)}>← {text.backToManual}</button>
      <button
        onclick={() => {
          query = entry.title
          contextHelp.entry = null
        }}>{text.findInManual}</button
      >
    </div>
  {:else}
    <p class="hint">{text.contextHint}</p>
    <input type="search" placeholder={text.search} aria-label={text.search} bind:value={query} />
    {#if query.trim()}
      <SearchResults
        {results}
        empty={text.noResults}
        onopen={(r) => open(r.page.app, r.page.slug, r.section.id || undefined)}
      />
    {:else}
      <select
        aria-label={text.contents}
        value={page?.slug}
        onchange={(e) => open(app, e.currentTarget.value)}
      >
        {#each pages as p (p.slug)}<option value={p.slug}>{p.title}</option>{/each}
      </select>
      {#if page}
        <PageView {page} {anchor} onlink={open} />
      {/if}
    {/if}
    <a
      class="full"
      href="{appUrl('manual')}#/{app}/{page?.slug ?? ''}"
      target="_blank"
      rel="noopener">{text.openFull} ↗</a
    >
  {/if}
</div>

<style>
  .help {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  input,
  select {
    width: 100%;
  }

  .help :global(.page) {
    font-size: 13px;
  }

  .help :global(.page h1) {
    font-size: 19px;
  }

  .help :global(.page h2) {
    font-size: 15px;
  }

  .context {
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.55;
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--panel-border));
    border-radius: 6px;
  }

  .context-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .context :global(ul) {
    margin: 4px 0;
    padding-left: 18px;
  }

  .context :global(p) {
    margin: 0 0 6px;
  }

  .context :global(code) {
    font-size: 12px;
    white-space: pre-wrap;
  }

  .context header {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 4px;
  }

  .context strong {
    flex: 1;
    color: var(--accent);
  }

  .close {
    padding: 0 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .full {
    font-size: 12px;
    color: var(--accent);
  }
</style>
