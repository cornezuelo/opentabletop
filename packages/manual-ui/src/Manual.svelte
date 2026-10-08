<script lang="ts">
  import { AppBrand, AppSwitcher, FoldTab, PreferencesButton } from '@open-tabletop/ui-kit'
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

  /** Whether the contents are shown: a per-viewer preference, kept in this browser. */
  const LAYOUT = 'opentabletop.manual.layout'
  function readNav(): boolean {
    try {
      return JSON.parse(localStorage.getItem(LAYOUT) ?? '{}').nav !== false
    } catch {
      return true
    }
  }
  let contents = $state(readNav())
  function toggleNav() {
    contents = !contents
    try {
      localStorage.setItem(LAYOUT, JSON.stringify({ nav: contents }))
    } catch {
      // Not remembered; it still applies now.
    }
  }

  function go(app: string, slug: string, anchor?: string) {
    query = ''
    location.hash = `#/${app}/${slug}${anchor ? `/${anchor}` : ''}`
  }
</script>

<div class="manual" class:no-nav={!contents}>
  <header>
    <AppBrand app="manual" name={text.title} />
    <AppSwitcher current="manual" {locale} />
    <div class="spacer"></div>
    <PreferencesButton {locale} {locales} {onlocale} />
  </header>

  {#if contents}
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
  {/if}

  <div class="center">
    <FoldTab
      side="left"
      open={contents}
      show={text.showContents}
      hide={text.hideContents}
      ontoggle={toggleNav}
    />
    <main>
      {#if query.trim()}
        <SearchResults
          {results}
          {query}
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
</div>

<style>
  .manual {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
  }

  .manual.no-nav {
    grid-template-columns: minmax(0, 1fr);
  }

  .center {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  .center > main {
    flex: 1;
    min-width: 0;
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

  /*
   * Scrolling areas keep room on the right: overlay scrollbars (Firefox on Linux) are
   * drawn over the content, so they fall on the margin instead of the text.
   */
  nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px calc(10px + var(--scroll-room)) 10px 10px;
    overflow: auto;
    scrollbar-gutter: stable;
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
    padding: 18px calc(28px + var(--scroll-room)) 18px 28px;
    overflow: auto;
    scrollbar-gutter: stable;
  }

  /*
   * The whole area scrolls (its bar at the window's edge), and the text keeps a readable
   * line length (about 100 characters).
   */
  main :global(.page) {
    max-width: 900px;
    overflow: visible;
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

    .center > :global(.fold) {
      display: none;
    }
  }
</style>
