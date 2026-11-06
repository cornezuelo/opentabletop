<script lang="ts">
  import { DefinitionEditor, RolledBy } from '@open-tabletop/oracle-ui'
  import {
    copyDefinition,
    deleteDefinition,
    deletePart,
    duplicatePart,
    FileEditor,
    manifestOf,
    ReadOnlyNotice,
  } from '@open-tabletop/pack-ui'
  import { localize, systemName, type TravelSystem } from '@open-tabletop/session'
  import { appUrl, confirmAction, MoreMenu, Tabs } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { kindName } from '../lib/kindNames'
  import { go, showSide, type DefTab } from '../lib/nav.svelte'
  import { systemParts, type PartTabKind } from '../lib/newSystem'
  import { library, oracleUi, systems } from '../lib/packs.svelte'
  import { partDoc } from '../lib/partDoc.svelte'
  import { definitionLine } from '../lib/tree'
  import { systemDoc } from '../lib/systemDoc.svelte'
  import ChecksForm from './forms/ChecksForm.svelte'
  import RulesForm from './forms/RulesForm.svelte'
  import PartForm from './parts/PartForm.svelte'

  /**
   * A definition of a pack, on its own: its form, its YAML and, what rolls, who rolls it. The
   * form is the one a system's tab shows, read with a system that uses it (or the pack's, or
   * the Generic rules); travel rules and bindings live in their system's tabs.
   */
  let { root, kind, id, tab }: { root: string; kind: string; id: string; tab: DefTab } = $props()

  const pack = $derived(library.pack(root))
  const packId = $derived(pack ? manifestOf(pack).id : undefined)
  const editable = $derived(library.isEditable(root))
  const rollable = $derived.by(() => {
    const def = library.registry.definitions.get(`${packId}/${id}`)
    return def?.kind === kind ? def : undefined
  })
  const extra = $derived(
    (library.registry.extras.get(packId ?? '') ?? []).find(
      (e) => e.kind === kind && (e.id ?? 'default') === id,
    ),
  )
  const file = $derived((rollable?.file ?? extra?.file ?? '').slice(root.length + 1))
  const name = $derived(
    rollable
      ? oracleUi.displayName(rollable)
      : localize(extra?.data.name as Parameters<typeof localize>[0], getLocale(), 'en') || id,
  )
  const source = $derived(file && extra ? { root, path: file, kind, id } : null)
  const doc = partDoc(() => source)

  const uses = (system: TravelSystem) =>
    systemParts(system, kind as PartTabKind).some(
      (p) => p.root === root && p.path === file && p.id === id,
    )
  /** The system its form reads: one that uses it, its pack's, or the Generic rules. */
  const system = $derived(
    systems.list.find(uses) ?? systems.list.find((s) => s.pack === packId) ?? systems.list[0],
  )
  /** Travel rules and bindings are edited with their system: the tab that does. */
  const owner = $derived.by(() => {
    const key = kind === 'travel-rules' ? 'rules' : kind === 'bindings' ? 'bindings' : undefined
    if (!key) return undefined
    const named = (s: TravelSystem) =>
      s.sources?.[key]?.pack === packId && s.sources?.[key]?.id === id
    const found = systems.list.find(named)
    return (
      found && { system: found, tab: key === 'rules' ? ('rules' as const) : ('checks' as const) }
    )
  })

  /** Rules or bindings no system names: edited here, the pack's other half beside them. */
  const lone = $derived.by(() => {
    if (owner || (kind !== 'travel-rules' && kind !== 'bindings')) return undefined
    const of = (wanted: string) =>
      (library.registry.extras.get(packId ?? '') ?? []).find((e) => e.kind === wanted)
    const rules = kind === 'travel-rules' ? extra : of('travel-rules')
    const bindings = kind === 'bindings' ? extra : of('bindings')
    if (!rules) return undefined
    const local = (file: string) => file.slice(root.length + 1)
    return {
      root,
      path: local(rules.file),
      rulesId: rules.id ?? 'default',
      ...(bindings && {
        bindings: { path: local(bindings.file), id: bindings.id ?? 'default' },
      }),
    }
  })
  const loneDoc = systemDoc(() => lone ?? { root: '', path: '' })

  const tabs = $derived([
    { id: 'form' as DefTab, label: t('library.form') },
    { id: 'yaml' as DefTab, label: t('library.yaml') },
    ...(rollable ? [{ id: 'used' as DefTab, label: t('library.used') }] : []),
  ])
  /** Your packs a copy can go to. */
  const others = $derived(library.packs.filter((p) => p.origin === 'user' && p.root !== root))

  function duplicate() {
    if (rollable) {
      const made = copyDefinition(library, rollable, root)
      const copy = made && library.registry.definitions.get(made)
      if (copy) go({ name: 'def', root, kind, id: copy.localId, tab: 'form' })
    } else if (source) {
      const made = duplicatePart(library, source)
      if (made) go({ name: 'def', root, kind, id: made, tab: 'form' })
    }
  }
  function copyTo(to: string) {
    if (!rollable) return
    const made = copyDefinition(library, rollable, to)
    const copy = made && library.registry.definitions.get(made)
    if (copy) go({ name: 'def', root: to, kind, id: copy.localId, tab: 'form' })
  }
  async function remove() {
    if (!(await confirmAction(t('library.confirmDelete', { name })))) return
    if (rollable) deleteDefinition(library, rollable)
    else if (source) deletePart(library, source)
    go({ name: 'pack', root })
  }

  const show = (next: DefTab) => go({ name: 'def', root, kind, id, tab: next }, true)
  const openPack = (made: string) => go({ name: 'pack', root: made })
</script>

{#if pack && (rollable || extra)}
  <article>
    <nav class="crumbs">
      <button class="link" onclick={() => openPack(root)}>{manifestOf(pack).name ?? root}</button>
      <span>›</span>
      <span>{kindName(kind)}</span>
    </nav>
    <div class="title">
      <h1 class="page-title">{name}</h1>
      {#if rollable}
        <a class="roll" href={`${appUrl('oracle')}#/def/${rollable.id}`}>{t('library.roll')}</a>
      {/if}
      <span class="spacer"></span>
      {#if editable || (rollable && others.length)}
        <MoreMenu label={t('library.more')}>
          {#if editable}<button onclick={duplicate}>{t('library.duplicate')}</button>{/if}
          {#if rollable}
            {#each others as other (other.root)}
              <button onclick={() => copyTo(other.root)}
                >{t('library.copyTo', { pack: manifestOf(other).name ?? other.root })}</button
              >
            {/each}
          {/if}
          {#if editable}<button class="danger" onclick={remove}>{t('library.delete')}</button>{/if}
        </MoreMenu>
      {/if}
    </div>
    <p class="file"><code>{file}</code> · <code>@{kind}/{id}</code></p>
    {#if !editable}
      <ReadOnlyNotice {library} locale={getLocale()} {root} onmade={openPack} />
    {/if}
    <Tabs {tabs} value={tab} label={t('library.defTabs')} prefix="def" onchange={show} />
    <div id="def-panel" role="tabpanel" aria-labelledby="def-tab-{tab}">
      {#if tab === 'yaml'}
        <div class="yaml">
          <FileEditor
            {library}
            locale={getLocale()}
            {root}
            path={file}
            line={definitionLine(library.readFile(root, file) ?? '', kind, id)}
            onpack={openPack}
          />
        </div>
      {:else if tab === 'used' && rollable}
        <RolledBy def={rollable} ui={oracleUi} />
      {:else if rollable}
        <!-- A bundled one is read as its form, with nothing to change. -->
        <fieldset disabled={!editable}>
          <DefinitionEditor def={rollable} {root} ui={oracleUi} />
        </fieldset>
      {:else if kind === 'travel-rules' || kind === 'bindings'}
        {#if owner}
          <p class="help">
            {t('library.withSystem', { system: systemName(owner.system, getLocale()) })}
          </p>
          <button
            class="button"
            onclick={() => {
              showSide('systems')
              go({ name: 'system', id: owner.system.id, tab: owner.tab })
            }}>{t('library.openSystem')}</button
          >
        {:else if lone && kind === 'travel-rules'}
          <p class="help">{t('library.loneRules')}</p>
          <RulesForm doc={loneDoc} />
        {:else if lone}
          <p class="help">{t('library.loneRules')}</p>
          <ChecksForm doc={loneDoc} />
        {:else}
          <p class="help">{t('library.noRules')}</p>
        {/if}
      {:else if kind === 'style'}
        <button class="button" onclick={() => go({ name: 'style', ref: `${packId}/${id}` })}
          >{t('library.openStyle')}</button
        >
      {:else}
        {#if system && !uses(system)}
          <p class="help">
            {t('library.readWith', { system: systemName(system, getLocale()) })}
          </p>
        {/if}
        {#if system}
          <PartForm {doc} {system} kind={kind as PartTabKind} {id} />
        {/if}
      {/if}
    </div>
  </article>
{:else}
  <p class="help">{t('library.notFound')}</p>
{/if}

<style>
  article {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 100%;
  }

  .crumbs {
    display: flex;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .title {
    display: flex;
    gap: 14px;
    align-items: baseline;
  }

  .spacer {
    flex: 1;
  }

  fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: none;
  }

  .roll {
    font-size: 13px;
    color: var(--accent);
  }

  .file {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .help {
    max-width: 760px;
    color: var(--text-muted);
  }

  .yaml {
    display: flex;
    height: 70vh;
  }
</style>
