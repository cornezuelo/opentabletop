<script lang="ts" module>
  /** One part of the tree: a campaign's pages, or General's (`campaign` absent). */
  export interface NoteSection {
    key: string
    campaign?: string
    name: string
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import {
    pageFolder,
    pageTree,
    pageTitle,
    type NoteFolder,
    type NotePage,
  } from '@open-tabletop/notes'
  import { SideFold, SideItem, SideList, tooltip } from '@open-tabletop/ui-kit'
  import type { Translate } from './i18n'

  /**
   * The pages as a tree: a section per campaign (the one being played first) and General,
   * folders inside each, the open page marked. **+** on a section or a folder makes a page
   * there (`onnew`, with its folder).
   */
  let {
    sections,
    pages,
    selected,
    t,
    onopen,
    onnew,
  }: {
    sections: NoteSection[]
    pages: readonly NotePage[]
    selected?: string
    t: Translate
    onopen: (page: NotePage) => void
    onnew: (campaign: string | undefined, folder: string) => void
  } = $props()

  /** Folded parts, by key (sections and folders start unfolded). */
  let folded = $state<Record<string, boolean>>({})
  const toggle = (key: string) => (folded = { ...folded, [key]: !folded[key] })

  const sectionPages = (section: NoteSection) =>
    pages.filter((p) => (p.campaign ?? undefined) === (section.campaign ?? undefined))

  // The open page's section and folders unfold.
  $effect(() => {
    const page = pages.find((p) => p.id === selected)
    if (!page) return
    const key = page.campaign ?? ''
    const parts = pageFolder(page).split('/').filter(Boolean)
    const keys = [key, ...parts.map((_, i) => `${key}/${parts.slice(0, i + 1).join('/')}`)]
    untrack(() => {
      if (keys.some((k) => folded[k]))
        folded = { ...folded, ...Object.fromEntries(keys.map((k) => [k, false])) }
    })
  })
  const count = (n: number) => (n === 1 ? t('tree.onePage') : t('tree.pages', { n }))
</script>

{#snippet folderBody(folder: NoteFolder, section: NoteSection)}
  {#each folder.folders as sub (sub.path)}
    {@const key = `${section.campaign ?? ''}/${sub.path}`}
    <SideFold name={sub.name} open={!folded[key]} ontoggle={() => toggle(key)}>
      {#snippet tags()}
        <button
          class="add"
          onclick={() => onnew(section.campaign, sub.path)}
          use:tooltip={t('tree.newHere')}
          aria-label={t('tree.newHere')}>+</button
        >
      {/snippet}
      {@render folderBody(sub, section)}
    </SideFold>
  {/each}
  {#each folder.pages as page (page.id)}
    <SideItem name={pageTitle(page)} selected={page.id === selected} onclick={() => onopen(page)} />
  {/each}
{/snippet}

<SideList>
  {#each sections as section (section.key)}
    {@const list = sectionPages(section)}
    {@const key = section.campaign ?? ''}
    <SideFold name={section.name} open={!folded[key]} ontoggle={() => toggle(key)}>
      {#snippet tags()}
        <span class="count" use:tooltip={count(list.length)}>{list.length}</span>
        <button
          class="add"
          onclick={() => onnew(section.campaign, '')}
          use:tooltip={t('tree.newHere')}
          aria-label={t('tree.newHere')}>+</button
        >
      {/snippet}
      {@render folderBody(pageTree(list), section)}
    </SideFold>
  {/each}
</SideList>

<style>
  .count {
    color: var(--text-muted);
    font-size: 0.85em;
  }

  .add {
    flex: none;
    width: 22px;
    padding: 0;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .add:hover {
    color: var(--accent);
  }
</style>
