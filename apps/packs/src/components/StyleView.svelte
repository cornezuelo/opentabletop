<script lang="ts">
  import { DEFAULT_TERRAINS, mapStyles, TERRAIN_SETS } from '@open-tabletop/map'
  import {
    copyStyle,
    definitionDoc,
    PackNotice,
    StyleForm,
    styleSource,
  } from '@open-tabletop/pack-ui'
  import { removeDefinition } from '@open-tabletop/pack-ui/yaml'
  import { localize } from '@open-tabletop/session'
  import { appUrl, confirmAction, InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'

  /**
   * A map style (`kind: style`) of any pack: pack-ui's `StyleForm`, the copy of a bundled one
   * (a new style of the user's), and removing one of the user's. A map drawn in it (open in
   * Map, in another tab) shows each change at once.
   */
  let { ref }: { ref: string } = $props()

  const named = $derived(mapStyles(library.registry).styles.find((s) => s.ref === ref))
  const source = $derived(styleSource(library, ref))
  const doc = definitionDoc(library, getLocale, () => source)
  const title = $derived(
    (named && localize(named.style.name, getLocale(), 'en')) || ref.split('/').pop() || ref,
  )
  /** Terrains to suggest: the palettes' and every system's. */
  const terrains = $derived([
    ...new Set([
      ...[...DEFAULT_TERRAINS, ...Object.values(TERRAIN_SETS).flat()].map((tt) => tt.id),
      ...systems.list.flatMap((s) => Object.keys(s.rules.terrains ?? {})),
    ]),
  ])
  /** Kinds of connection every system declares. */
  const kinds = $derived([
    ...new Set(systems.list.flatMap((s) => Object.keys(s.rules.connections ?? {}))),
  ])

  function copy() {
    const made = copyStyle(library, ref, getLocale())
    if (made) go({ name: 'style', ref: made })
  }

  async function remove() {
    if (!source || !(await confirmAction(t('styles.confirmRemove', { name: title })))) return
    const content = library.readFile(source.root, source.path) ?? ''
    library.writeFile(source.root, source.path, removeDefinition(content, `@style/${source.id}`))
    go({ name: 'welcome' })
  }
</script>

<div class="view">
  <header>
    <h1 class="page-title">{title}</h1>
    <code>{ref}</code>
    {#if source}
      <button
        class="link"
        onclick={() =>
          go({ name: 'def', root: source.root, kind: 'style', id: source.id, tab: 'yaml' })}
        >{t('library.yaml')}</button
      >
    {/if}
    <span class="actions">
      <button class="button" onclick={copy}>{t('styles.copy')}</button>
      {#if doc.editable}
        <button class="button danger" onclick={remove}>{t('styles.remove')}</button>
      {/if}
      <InfoTip markdown={t('styles.help', { map: appUrl('map') })} />
    </span>
  </header>
  {#if !source}
    <p class="help">{t('styles.missing', { style: ref })}</p>
  {:else}
    <PackNotice
      {library}
      root={source.root}
      locale={getLocale()}
      texts={{ readOnly: t('styles.readOnly'), copyHelp: t('styles.help', { map: appUrl('map') }) }}
    >
      {#snippet copy()}{/snippet}
    </PackNotice>
    <StyleForm {doc} locale={getLocale()} {terrains} {kinds} registry={library.registry} />
  {/if}
</div>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: baseline;
  }

  h1 {
    margin: 0;
  }

  code {
    font-size: 12px;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-left: auto;
  }

  .help {
    margin: 0;
    color: var(--text-muted);
  }
</style>
