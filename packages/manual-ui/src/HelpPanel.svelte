<script lang="ts">
  import { appUrl } from '@open-tabletop/ui-kit'
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
  <a class="full" href="{appUrl('manual')}#/{app}/{page?.slug ?? ''}" target="_blank" rel="noopener"
    >{text.openFull} ↗</a
  >
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

  .full {
    font-size: 12px;
    color: var(--accent);
  }
</style>
