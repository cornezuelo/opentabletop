<script lang="ts">
  import type { ManualPage } from './pages'
  import { pageLink, renderPage } from './render'

  /** One manual page. Links to other pages navigate; outside links open a new tab. */
  let {
    page,
    anchor,
    onlink,
  }: {
    page: ManualPage
    /** Section to scroll to. */
    anchor?: string
    onlink: (app: string, slug: string, anchor?: string) => void
  } = $props()

  let host: HTMLElement
  const html = $derived(renderPage(page.body))

  $effect(() => {
    void html
    const target = anchor ? host.querySelector(`#${CSS.escape(anchor)}`) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else host.scrollTop = 0
  })

  function onclick(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href) return
    const link = pageLink(href)
    if (link) {
      e.preventDefault()
      onlink(link.app ?? page.app, link.slug, link.anchor)
    } else if (/^https?:/.test(href)) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article class="page" bind:this={host} {onclick}>
  <h1>{page.title}</h1>
  <!-- Our own Markdown, sanitized. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</article>

<style>
  .page {
    overflow: auto;
    line-height: 1.6;
  }

  .page h1 {
    margin: 0 0 12px;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: normal;
  }

  .page :global(h2) {
    margin: 22px 0 8px;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: normal;
    color: var(--accent);
    scroll-margin-top: 8px;
  }

  .page :global(h3) {
    margin: 16px 0 6px;
    font-size: 14px;
  }

  .page :global(p),
  .page :global(li) {
    color: var(--text);
  }

  .page :global(a) {
    color: var(--accent);
  }

  .page :global(code) {
    padding: 1px 4px;
    font-size: 0.92em;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 3px;
  }

  .page :global(pre) {
    padding: 10px;
    overflow: auto;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .page :global(pre code) {
    padding: 0;
    border: none;
  }

  .page :global(kbd) {
    padding: 0 5px;
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    border: 1px solid var(--panel-border);
    border-bottom-width: 2px;
    border-radius: 4px;
  }

  .page :global(table) {
    border-collapse: collapse;
  }

  .page :global(th),
  .page :global(td) {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid var(--panel-border);
  }

  .page :global(blockquote) {
    margin: 10px 0;
    padding: 6px 12px;
    color: var(--text-muted);
    border-left: 3px solid var(--accent);
  }
</style>
