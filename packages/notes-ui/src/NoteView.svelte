<script lang="ts">
  import { picturesIn, type NotePage } from '@open-tabletop/notes'
  import { cachedImage, onPictureChange } from '@open-tabletop/ui-kit'
  import { onDestroy } from 'svelte'
  import type { GameIndex } from './game'
  import type { Translate } from './i18n'
  import { renderPage } from './render'
  import { linkResolver } from './resolve'
  import { signStyle } from './signs'

  /**
   * A text of Notes read: a page's (or a journal's note, written in `campaign`), its links
   * shown by what they reach now. A page link opens it here (`onpage`), one to a page that
   * doesn't exist yet makes it (`onnew`); a link into the games opens its app.
   */
  let {
    body,
    pages,
    index,
    from,
    onpage,
    onnew,
    t,
  }: {
    body: string
    pages: readonly NotePage[]
    index: GameIndex
    /** Where the text is written: which pages its links reach. */
    from: { campaign?: string; id?: string }
    onpage: (id: string, heading?: string) => void
    onnew: (path: string) => void
    t: Translate
  } = $props()

  /** The library's pictures the text shows, as read (null: not in the library). */
  let pictures = $state<Record<string, { data: string; width: number } | null>>({})
  function readPicture(id: string) {
    void cachedImage(id).then((image) => {
      pictures[id] = image && { data: image.data, width: image.width }
    })
  }
  $effect(() => {
    for (const id of picturesIn(body)) if (!(id in pictures)) readPicture(id)
  })
  const stop = onPictureChange((id) => {
    if (id in pictures) readPicture(id)
  })
  onDestroy(stop)

  const html = $derived(
    renderPage(body, linkResolver(pages, index, from), {
      get: (id) => pictures[id],
      missing: t('pictures.missing'),
    }),
  )

  function click(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a')
    if (!link) return
    if (link.dataset.page) {
      event.preventDefault()
      onpage(link.dataset.page, link.dataset.heading)
    } else if (link.dataset.new !== undefined) {
      event.preventDefault()
      onnew(link.dataset.new)
    }
  }
</script>

<!-- Clicks on the links drawn inside it: each is a real link, reached by keyboard too. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="note-body" style={signStyle()} onclick={click}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- renderPage escapes what's written -->
  {@html html}
</div>

<style>
  .note-body {
    max-width: 72ch;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .note-body :global(h1:first-child),
  .note-body :global(h2:first-child) {
    margin-top: 0;
  }

  .note-body :global(a) {
    color: var(--accent);
  }

  /* A link to a website opens in another tab. */
  .note-body :global(a[target='_blank']:not(.game-link))::after {
    content: ' ↗';
    font-size: 0.85em;
  }

  .note-body :global(.note-link) {
    text-decoration: none;
    border-bottom: 1px solid rgb(200 162 74 / 0.45);
  }

  .note-body :global(.note-link:hover) {
    border-bottom-color: var(--accent);
  }

  /* A page not written yet: a click makes it. */
  .note-body :global(.note-link.new) {
    color: var(--text-muted);
    border-bottom-style: dashed;
  }

  .note-body :global(.game-link) {
    display: inline-flex;
    gap: 3px;
    align-items: baseline;
    padding: 0 5px;
    color: var(--text);
    text-decoration: none;
    background: rgb(200 162 74 / 0.1);
    border: 1px solid rgb(200 162 74 / 0.3);
    border-radius: 4px;
  }

  .note-body :global(a.game-link:hover) {
    border-color: var(--accent);
  }

  .note-body :global(.game-link.missing) {
    color: var(--text-muted);
    background: none;
    border-style: dashed;
  }

  .note-body :global(.sign) {
    display: inline-block;
    align-self: center;
    width: 0.9em;
    height: 0.9em;
    background: var(--accent);
    mask: var(--sign) center / contain no-repeat;
  }

  .note-body :global(.sign-character) {
    --sign: var(--sign-character);
  }

  .note-body :global(.sign-map) {
    --sign: var(--sign-map);
  }

  .note-body :global(.sign-campaign) {
    --sign: var(--sign-campaign);
  }

  .note-body :global(.sign-faction) {
    --sign: var(--sign-faction);
  }

  /* A picture of the library: the column's width at most, a small one at its size. */
  .note-body :global(.note-picture) {
    display: block;
    margin: 12px 0;
  }

  .note-body :global(.note-picture img) {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .note-body :global(.note-picture .caption) {
    display: block;
    margin-top: 4px;
    color: var(--text-muted);
    font-size: 0.9em;
    font-style: italic;
  }

  .note-body :global(.note-picture.loading) {
    min-height: 48px;
  }

  .note-body :global(.note-picture.missing .gone) {
    display: block;
    padding: 12px;
    color: var(--text-muted);
    border: 1px dashed var(--panel-border);
    border-radius: 4px;
  }

  .note-body :global(blockquote) {
    margin-left: 0;
    padding-left: 12px;
    color: var(--text-muted);
    border-left: 3px solid var(--panel-border);
  }

  .note-body :global(code) {
    padding: 0 3px;
    font-size: 0.92em;
    background: var(--panel);
    border-radius: 3px;
  }

  .note-body :global(pre) {
    padding: 8px 10px;
    overflow-x: auto;
    background: var(--panel);
    border-radius: 4px;
  }

  .note-body :global(pre code) {
    padding: 0;
    background: none;
  }

  .note-body :global(table) {
    border-collapse: collapse;
  }

  .note-body :global(th),
  .note-body :global(td) {
    padding: 3px 8px;
    border: 1px solid var(--panel-border);
  }

  .note-body :global(hr) {
    border: none;
    border-top: 1px solid var(--panel-border);
  }
</style>
