<script lang="ts">
  import { backlinks, pageTitle, unlinkedMentions, type NotePage } from '@open-tabletop/notes'
  import { Icon, InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import type { GameIndex } from './game'
  import type { Translate } from './i18n'
  import { pageThings } from './pageLinks'
  import { signStyle } from './signs'

  /**
   * What a page has to do with the rest: the pages (and the campaign's Log) that link to it,
   * the games' things it names or that point at it, and the pages that write its title
   * without a link (**Link** makes them links).
   */
  let {
    page,
    pages,
    index,
    journal = [],
    journalUrl,
    t,
    onpage,
    onlink,
  }: {
    page: NotePage
    pages: readonly NotePage[]
    index: GameIndex
    /** The lines of the campaign's Log's notes that link here. */
    journal?: string[]
    /** Where the Log is (Campaign's Log tab). */
    journalUrl?: string
    t: Translate
    onpage: (id: string) => void
    /** Makes the mentions of this page in `other` links. */
    onlink: (other: NotePage) => void
  } = $props()

  const linked = $derived(backlinks(pages, page))
  const things = $derived(pageThings(pages, index, page))
  const unlinked = $derived(unlinkedMentions(pages, page))
  const kindName = (kind: string) => t(`kinds.${kind}` as Parameters<Translate>[0])
</script>

<div class="links" style={signStyle()}>
  <section>
    <h3 class="overline">
      {t('links.backlinks')}<InfoTip text={t('links.backlinksHelp')} />
      {#if linked.length + journal.length}<span class="count">{linked.length + journal.length}</span
        >{/if}
    </h3>
    {#each linked as m (m.page.id)}
      <button class="entry" onclick={() => onpage(m.page.id)}>
        <span class="name"><Icon name="page" />{pageTitle(m.page)}</span>
        {#each m.lines.slice(0, 2) as line, i (i)}<span class="line">{line}</span>{/each}
      </button>
    {/each}
    {#if journal.length}
      <a class="entry" href={journalUrl} target="_blank" rel="noopener">
        <span class="name"
          ><span class="sign sign-campaign" aria-hidden="true"></span>{t('links.journal')} ↗</span
        >
        {#each journal.slice(0, 2) as line, i (i)}<span class="line">{line}</span>{/each}
      </a>
    {/if}
    {#if !linked.length && !journal.length}<p class="hint">{t('links.none')}</p>{/if}
  </section>

  <section>
    <h3 class="overline">
      {t('links.game')}<InfoTip text={t('links.gameHelp')} />
      {#if things.length}<span class="count">{things.length}</span>{/if}
    </h3>
    {#each things as item (item.thing.link + item.thing.name)}
      <svelte:element
        this={item.url ? 'a' : 'span'}
        class="entry thing"
        class:missing={!index.things.some((x) => x.link === item.thing.link)}
        href={item.url ?? undefined}
        target="_blank"
        rel="noopener"
      >
        <span class="name">
          <span class="sign sign-{item.thing.kind}" aria-hidden="true"></span>
          {item.thing.name}
          {#if item.linksHere}<span
              class="back"
              use:tooltip={t('links.namesIt')}
              aria-label={t('links.namesIt')}>⇄</span
            >{/if}
        </span>
        <span class="line"
          >{[kindName(item.thing.kind), item.thing.where].filter(Boolean).join(' · ')}</span
        >
      </svelte:element>
    {/each}
    {#if !things.length}<p class="hint">{t('links.none')}</p>{/if}
  </section>

  {#if unlinked.length}
    <section>
      <h3 class="overline">
        {t('links.unlinked')}<InfoTip text={t('links.unlinkedHelp')} />
        <span class="count">{unlinked.length}</span>
      </h3>
      {#each unlinked as m (m.page.id)}
        <div class="mention">
          <button class="entry" onclick={() => onpage(m.page.id)}>
            <span class="name"><Icon name="page" />{pageTitle(m.page)}</span>
            <span class="line">{m.lines[0]}</span>
          </button>
          <button
            class="small"
            onclick={() => onlink(m.page)}
            aria-label={t('links.link')}
            use:tooltip={t('links.linkTip')}><Icon name="link" /></button
          >
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .links {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h3 {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 0 0 2px;
  }

  .count {
    color: var(--text-muted);
    font-weight: normal;
  }

  .entry {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 5px 8px;
    color: var(--text);
    text-align: left;
    text-decoration: none;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .entry:hover {
    background: var(--panel);
    border-color: var(--panel-border);
  }

  .name {
    display: flex;
    gap: 5px;
    align-items: center;
    color: var(--accent);
  }

  .thing .name {
    color: var(--text);
  }

  .missing {
    opacity: 0.6;
  }

  .line {
    overflow: hidden;
    color: var(--text-muted);
    font-size: 0.85em;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .back {
    margin-left: auto;
    color: var(--accent);
  }

  .sign {
    flex: none;
    width: 0.95em;
    height: 0.95em;
    background: var(--accent);
    mask: var(--sign) center / contain no-repeat;
  }

  .sign-character {
    --sign: var(--sign-character);
  }

  .sign-map {
    --sign: var(--sign-map);
  }

  .sign-campaign {
    --sign: var(--sign-campaign);
  }

  .sign-faction {
    --sign: var(--sign-faction);
  }

  .mention {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .mention .entry {
    flex: 1;
    min-width: 0;
  }

  .hint {
    margin: 0 8px;
  }
</style>
