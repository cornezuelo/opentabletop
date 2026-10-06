<script lang="ts">
  import { AppBrand, AppSwitcher } from '@open-tabletop/ui-kit'
  import { textFor } from './i18n'
  import { manual } from './manual'
  import PageView from './PageView.svelte'
  import SearchResults from './SearchResults.svelte'

  /**
   * The whole manual: every app's pages, search across all of them, and the place the
   * in-app help links to. The view lives in the URL hash: #/<app>/<page>[/<section>].
   */
  let {
    locale,
    locales,
    onlocale,
  }: { locale: string; locales: Record<string, string>; onlocale: (locale: string) => void } =
    $props()

  const text = $derived(textFor(locale))
  let query = $state('')
  let route = $state(parse())

  function parse(): { app: string; slug?: string; anchor?: string } {
    const [app, slug, anchor] = location.hash.replace(/^#\/?/, '').split('/')
    return { app: manual.apps.includes(app) ? app : manual.apps[0], slug, anchor }
  }

  $effect(() => {
    const onhash = () => (route = parse())
    window.addEventListener('hashchange', onhash)
    return () => window.removeEventListener('hashchange', onhash)
  })

  const pages = $derived(manual.pages(route.app, locale))
  const page = $derived(pages.find((p) => p.slug === route.slug) ?? pages[0])
  const results = $derived(query.trim() ? manual.search(query, locale) : [])

  function go(app: string, slug: string, anchor?: string) {
    query = ''
    location.hash = `#/${app}/${slug}${anchor ? `/${anchor}` : ''}`
  }
</script>

<div class="manual">
  <header>
    <AppBrand app="manual" name={text.title} />
    <AppSwitcher current="manual" {locale} />
    <div class="spacer"></div>
    <select
      aria-label={text.language}
      value={locale}
      onchange={(e) => onlocale(e.currentTarget.value)}
    >
      {#each Object.entries(locales) as [code, name] (code)}<option value={code}>{name}</option
        >{/each}
    </select>
  </header>

  <nav>
    <input type="search" placeholder={text.search} aria-label={text.search} bind:value={query} />
    {#each manual.apps as app (app)}
      <span class="app">{text.apps[app] ?? app}</span>
      <ul>
        {#each manual.pages(app, locale) as p (p.slug)}
          <li>
            <button
              class:active={app === route.app && p.slug === page?.slug}
              onclick={() => go(app, p.slug)}>{p.title}</button
            >
          </li>
        {/each}
      </ul>
    {/each}
  </nav>

  <main>
    {#if query.trim()}
      <SearchResults
        {results}
        showApp
        appName={(app) => text.apps[app] ?? app}
        empty={text.noResults}
        onopen={(r) => go(r.page.app, r.page.slug, r.section.id || undefined)}
      />
    {:else if page}
      <PageView {page} anchor={route.anchor} onlink={go} />
    {/if}
  </main>
</div>

<style>
  .manual {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
  }

  header {
    display: flex;
    grid-column: 1 / -1;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-border);
  }

  .spacer {
    flex: 1;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    overflow: auto;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  .app {
    margin-top: 8px;
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding: 0 0 0 8px;
    list-style: none;
  }

  li button {
    width: 100%;
    padding: 3px 6px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  li button:hover,
  li button.active {
    background: rgb(200 162 74 / 0.12);
  }

  main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 18px 28px;
    overflow: auto;
  }

  main :global(.page) {
    max-width: 760px;
  }

  @media (max-width: 760px) {
    .manual {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto minmax(0, 1fr);
    }

    nav {
      max-height: 35vh;
      border-right: none;
      border-bottom: 1px solid var(--panel-border);
    }
  }
</style>
