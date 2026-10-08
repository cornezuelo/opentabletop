<script lang="ts">
  import {
    appUrl,
    closeHelp,
    contextHelp,
    helpMarkdown,
    insertTarget,
    insertText,
    Markdown,
    showToast,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { textFor } from './i18n'
  import { manual } from './manual'
  import PageView from './PageView.svelte'
  import type { SearchResult } from './pages'
  import SearchResults from './SearchResults.svelte'

  /**
   * The help column: the explanation of the control in use (with the manual's sections
   * about it), or the manual itself, small enough for a side panel, with search. Examples in
   * code go into the last field used with a click.
   */
  let { app, locale }: { app: string; locale: string } = $props()

  /** Besides the app's own pages, what the column searches and opens. */
  const SHARED = ['technical', 'packs']
  const SYNTAX = { app: 'technical', slug: 'syntax' }

  const text = $derived(textFor(locale))
  const pages = $derived(manual.pages(app, locale))
  const technical = $derived(manual.pages('technical', locale))
  let query = $state('')
  let at = $state<{ app: string; slug: string; anchor?: string } | null>(null)
  const page = $derived(
    (at && manual.page(at.app, at.slug, locale)) ??
      pages.find((p) => p.slug === at?.slug) ??
      pages[0],
  )
  const search = (q: string, scopes: string[], each = 30): SearchResult[] =>
    scopes.flatMap((scope) => manual.search(q, locale, scope).slice(0, each))
  const results = $derived(query.trim() ? search(query, [app, ...SHARED]).slice(0, 40) : [])
  const entry = $derived(contextHelp.entry)
  /** The manual's sections about the control explained: the syntax first, then the app's. */
  const related = $derived(entry ? search(entry.title, ['technical', app], 2) : [])
  const target = $derived(insertTarget())
  const name = (scope: string) => text.apps[scope] ?? scope

  function open(nextApp: string, nextSlug: string, nextAnchor?: string) {
    if (nextApp !== app && !SHARED.includes(nextApp)) {
      window.open(
        `${appUrl('manual')}#/${nextApp}/${nextSlug}${nextAnchor ? `/${nextAnchor}` : ''}`,
      )
      return
    }
    query = ''
    contextHelp.entry = null
    at = { app: nextApp, slug: nextSlug, anchor: nextAnchor }
  }

  /** A click on an example in code puts it where the cursor was in the last field used. */
  function insert(event: MouseEvent) {
    const code = (event.target as HTMLElement).closest('code')
    if (!code || code.closest('a') || !target) return
    const example = (code.textContent ?? '').replace(/\n+$/, '')
    if (example && insertText(example))
      showToast(text.inserted.replace('{field}', target.label || text.theField))
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="help" class:can-insert={!!target} data-no-insert onclick={insert}>
  <div class="tools">
    <input type="search" placeholder={text.search} aria-label={text.search} bind:value={query} />
    <button
      class:active={!entry && !query && page?.app === SYNTAX.app && page?.slug === SYNTAX.slug}
      use:tooltip={text.syntaxTip}
      onclick={() => open(SYNTAX.app, SYNTAX.slug)}>{text.syntax}</button
    >
  </div>
  {#if target && !query.trim()}
    <p class="hint">{text.insertHint.replace('{field}', target.label || text.theField)}</p>
  {/if}

  {#if query.trim()}
    <SearchResults
      {results}
      {query}
      showApp
      appName={name}
      empty={text.noResults}
      onopen={(r) => open(r.page.app, r.page.slug, r.section.id || undefined)}
    />
  {:else if entry}
    <!-- The control being explained (a dotted label clicked, or the field with focus). -->
    <section class="context" aria-live="polite">
      <header>
        <h2>{entry.title}</h2>
        <button
          class="close"
          aria-label={text.contextClose}
          use:tooltip={text.contextClose}
          onclick={closeHelp}>✕</button
        >
      </header>
      <Markdown text={entry.markdown ?? helpMarkdown(entry.text ?? '')} />
      {#if related.length}
        <h3>{text.inTheManual}</h3>
        <SearchResults
          results={related}
          query={entry.title}
          showApp
          appName={name}
          empty=""
          onopen={(r) => open(r.page.app, r.page.slug, r.section.id || undefined)}
        />
      {/if}
      <button class="link" onclick={() => (contextHelp.entry = null)}>← {text.backToManual}</button>
    </section>
  {:else}
    <p class="hint">{text.contextHint}</p>
    <select
      aria-label={text.contents}
      value={page ? `${page.app}/${page.slug}` : ''}
      onchange={(e) => {
        const [nextApp, nextSlug] = e.currentTarget.value.split('/')
        open(nextApp, nextSlug)
      }}
    >
      {#each pages as p (p.slug)}<option value="{p.app}/{p.slug}">{p.title}</option>{/each}
      <optgroup label={name('technical')}>
        {#each technical as p (p.slug)}<option value="{p.app}/{p.slug}">{p.title}</option>{/each}
      </optgroup>
    </select>
    {#if page}
      <PageView {page} anchor={at?.anchor} onlink={open} />
    {/if}
  {/if}
  <a
    class="full"
    href="{appUrl('manual')}#/{page?.app ?? app}/{page?.slug ?? ''}"
    target="_blank"
    rel="noopener">{text.openFull} ↗</a
  >
</div>

<style>
  .help {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .tools {
    display: flex;
    gap: 6px;
  }

  .tools input {
    flex: 1;
    min-width: 0;
  }

  .tools button {
    padding: 4px 10px;
    font: inherit;
    font-size: 12px;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .tools button:hover,
  .tools button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

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

  /* Examples in code can be inserted into the last field used. */
  .can-insert :global(code) {
    cursor: copy;
    border-radius: 3px;
  }

  .can-insert :global(code:hover) {
    outline: 1px solid var(--accent);
  }

  .context {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    line-height: 1.55;
  }

  .context header {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 6px;
  }

  .context h2 {
    flex: 1;
    margin: 0;
    font-family: Georgia, serif;
    font-size: 17px;
    font-weight: normal;
    color: var(--accent);
  }

  .context h3 {
    margin: 14px 0 4px;
    font-size: 12px;
    font-weight: normal;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .context :global(ul:not(.results)) {
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

  .close {
    padding: 0 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .close:hover {
    color: var(--accent);
  }

  .link {
    align-self: flex-start;
    margin-top: 10px;
    padding: 0;
    font: inherit;
    font-size: 12px;
    color: var(--accent);
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
