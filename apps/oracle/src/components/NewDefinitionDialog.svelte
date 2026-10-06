<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { KIND_ORDER } from '@open-tabletop/oracle-ui'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { createDefinition, dataFiles, slugify } from '../lib/packs/definitions'
  import { cleanFilePath, manifestOf } from '../lib/packs/workspace'
  import { workspace } from '../lib/packs/workspace.svelte'

  /** New table, oracle, generator or deck in one of the user's packs, from a template. */
  let { root: initialRoot, onclose }: { root?: string; onclose: () => void } = $props()

  const packs = $derived(workspace.packs.filter((p) => p.origin === 'user'))
  // svelte-ignore state_referenced_locally
  let root = $state(initialRoot ?? packs[0]?.root ?? '')
  let kind = $state<Compiled['kind']>('table')
  let name = $state('')
  let file = $state('')
  let newFile = $state('')
  const files = $derived(workspace.pack(root) ? dataFiles(workspace.pack(root)!) : [])
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  function create() {
    if (!root || !name.trim()) return
    const target = file === '+' ? cleanFilePath(newFile) : file || files[0]
    const id = createDefinition(root, kind, name, target ?? undefined)
    dialog.close()
    if (id) go({ name: 'def', id, tab: 'edit' })
  }
</script>

<dialog bind:this={dialog} {onclose}>
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
      <div class="kinds" role="radiogroup" aria-label={t('pack.kind')}>
        {#each KIND_ORDER as k (k)}
          <label class:active={kind === k}>
            <input type="radio" bind:group={kind} value={k} />
            <strong>{t(`kinds.${k}`)}</strong>
            <span>{t(`kindTips.${k}`)}</span>
          </label>
        {/each}
      </div>
      <label class="field">
        <span>{t('newDef.name')}</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={name} autofocus />
        {#if name.trim()}<small>{t('newDef.idPreview', { id: slugify(name) })}</small>{/if}
      </label>
      <label class="field">
        <span>{t('newDef.file')}<InfoTip text={t('newDef.fileHelp')} /></span>
        <select bind:value={file}>
          {#each files as f (f)}<option value={f}>{f}</option>{/each}
          <option value="+">{t('newDef.newFile')}</option>
        </select>
      </label>
      {#if file === '+' || !files.length}
        <input type="text" placeholder={t('pack.fileName')} bind:value={newFile} />
      {/if}
    {/if}
    <div class="buttons">
      <button type="button" onclick={() => dialog.close()}>{t('newPack.cancel')}</button>
      <button type="submit" class="primary" disabled={!packs.length || !name.trim()}
        >{t('newPack.create')}</button
      >
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: 440px;
    padding: 18px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
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

  .buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .buttons button {
    padding: 6px 14px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .buttons .primary {
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .buttons .primary:disabled {
    opacity: 0.5;
  }
</style>
