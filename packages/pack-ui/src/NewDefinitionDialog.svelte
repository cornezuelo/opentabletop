<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import {
    createDefinition,
    createSystemDefinition,
    dataFiles,
    hasKind,
    slugify,
  } from './definitions'
  import { tableFromText } from './fromText'
  import { cleanFilePath } from './packFiles'
  import { manifestOf } from './packs'
  import { PART_KINDS, SYSTEM_KINDS, type PartKind, type SystemKind } from './systemTemplates'

  /** New table, oracle, generator or deck in one of the user's packs, from a template. */
  let {
    library,
    locale,
    kinds,
    root: initialRoot,
    onclose,
    onpart,
    ondefinition,
  }: {
    library: PackLibrary
    locale: string
    /** What can be made, in the order offered. */
    kinds: readonly Compiled['kind'][]
    root?: string
    onclose: () => void
    /** A part of a system was written in `root`. */
    onpart: (root: string, kind: string, id: string) => void
    /** A definition was made. */
    ondefinition: (id: string) => void
  } = $props()
  const t = translator(() => locale)

  const packs = $derived(library.packs.filter((p) => p.origin === 'user'))
  // svelte-ignore state_referenced_locally
  let root = $state(initialRoot ?? packs[0]?.root ?? '')
  let kind = $state<Compiled['kind'] | SystemKind | PartKind>('table')
  const system = $derived(([...SYSTEM_KINDS, ...PART_KINDS] as string[]).includes(kind))
  const taken = (k: SystemKind) => !!library.pack(root) && hasKind(library.pack(root)!, k)
  let name = $state('')
  let file = $state('')
  let newFile = $state('')
  const files = $derived(library.pack(root) ? dataFiles(library.pack(root)!) : [])
  let dialog: HTMLDialogElement
  /** A table made from pasted text (a numbered list from a PDF, a CSV, a plain list). */
  let fromText = $state(false)
  let pasted = $state('')
  const imported = $derived(kind === 'table' && fromText ? tableFromText(pasted) : undefined)

  $effect(() => {
    dialog.showModal()
  })

  function create() {
    const target = file === '+' ? cleanFilePath(newFile) : file || files[0]
    if (system) {
      if (!root) return
      const made = createSystemDefinition(library, root, kind as SystemKind | PartKind)
      dialog.close()
      if (made) onpart(root, kind, made.id)
      return
    }
    if (!root || !name.trim()) return
    const body =
      imported && imported.entries.length
        ? { ...(imported.roll && { roll: imported.roll }), entries: imported.entries }
        : undefined
    const id = createDefinition(
      library,
      root,
      kind as Compiled['kind'],
      name,
      target ?? undefined,
      body,
    )
    dialog.close()
    if (id) ondefinition(id)
  }
</script>

<dialog class="modal" bind:this={dialog} {onclose}>
  <form
    method="dialog"
    onsubmit={(e) => {
      e.preventDefault()
      create()
    }}
  >
    <h2>{t('newDef.title')}</h2>
    {#if !packs.length}
      <p class="help">{t('newDef.noPacks')}</p>
    {:else}
      <label class="field">
        <span>{t('newDef.pack')}</span>
        <select bind:value={root}>
          {#each packs as p (p.root)}
            <option value={p.root}>{manifestOf(p).name ?? p.root}</option>
          {/each}
        </select>
      </label>
      <div class="kinds" role="radiogroup" aria-label={t('newDef.kind')}>
        {#each kinds as k (k)}
          <label class:active={kind === k}>
            <input type="radio" bind:group={kind} value={k} />
            <strong>{t(`kinds.${k}`)}</strong>
            <span>{t(`kindTips.${k}`)}</span>
          </label>
        {/each}
      </div>
      <span class="group-title"
        >{t('newDef.forTravel')}<InfoTip text={t('newDef.forTravelHelp')} /></span
      >
      <div class="kinds" role="radiogroup" aria-label={t('newDef.forTravel')}>
        {#each SYSTEM_KINDS as k (k)}
          <label class:active={kind === k} class:disabled={taken(k)}>
            <input type="radio" bind:group={kind} value={k} disabled={taken(k)} />
            <strong>{t(`newDef.system.${k}`)}</strong>
            <span>{taken(k) ? t('newDef.alreadyHas') : t(`newDef.systemTips.${k}`)}</span>
          </label>
        {/each}
        {#each PART_KINDS as k (k)}
          <label class:active={kind === k}>
            <input type="radio" bind:group={kind} value={k} />
            <strong>{t(`newDef.system.${k}`)}</strong>
            <span>{t(`newDef.systemTips.${k}`)}</span>
          </label>
        {/each}
      </div>
      {#if !system}
        <label class="field">
          <span>{t('newDef.name')}</span>
          <!-- svelte-ignore a11y_autofocus -->
          <input type="text" bind:value={name} autofocus />
          {#if name.trim()}<small>{t('newDef.idPreview', { id: slugify(name) })}</small>{/if}
        </label>
      {/if}
      {#if kind === 'table'}
        <label class="check">
          <input type="checkbox" bind:checked={fromText} />
          <span>{t('newDef.fromText')}<InfoTip text={t('newDef.fromTextHelp')} /></span>
        </label>
        {#if fromText}
          <textarea rows="7" bind:value={pasted} placeholder={t('newDef.fromTextPlaceholder')}
          ></textarea>
          {#if imported?.entries.length}
            <small
              >{imported.roll
                ? t('newDef.fromTextRolled', {
                    count: imported.entries.length,
                    roll: imported.roll,
                  })
                : t('newDef.fromTextWeighted', {
                    count: imported.entries.length,
                  })}{#if imported.skipped.length}
                &nbsp;· {t('newDef.fromTextSkipped', {
                  lines: imported.skipped.join(', '),
                })}{/if}</small
            >
          {/if}
        {/if}
      {/if}
      {#if !system}
        <label class="field">
          <span>{t('newDef.file')}<InfoTip text={t('newDef.fileHelp')} /></span>
          <select bind:value={file}>
            {#each files as f (f)}<option value={f}>{f}</option>{/each}
            <option value="+">{t('newDef.newFile')}</option>
          </select>
        </label>
        {#if file === '+' || !files.length}
          <input type="text" placeholder={t('newDef.fileName')} bind:value={newFile} />
        {/if}
      {/if}
    {/if}
    <div class="dialog-buttons">
      <button type="button" onclick={() => dialog.close()}>{t('newPack.cancel')}</button>
      <button
        type="submit"
        class="primary"
        disabled={!packs.length ||
          (!system && !name.trim()) ||
          (!!imported && !imported.entries.length)}>{t('newPack.create')}</button
      >
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: 440px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  textarea {
    width: 100%;
    font-family: var(--mono, monospace);
    font-size: 12px;
  }

  .kinds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .kinds label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    font-size: 12px;
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .kinds label.disabled {
    opacity: 0.5;
    cursor: default;
  }

  .group-title {
    font-size: 12px;
    color: var(--text-muted);
  }

  .kinds label.active {
    border-color: var(--accent);
  }

  .kinds strong {
    color: var(--text);
    font-size: 13px;
  }

  .kinds input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  small,
  .help {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
