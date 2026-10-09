<script lang="ts">
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { duplicatePack, isValidId, manifestOf, newPack } from '../lib/packs/workspace'

  /** With `from` (a pack's folder): a new pack of yours made from that one. */
  let { onclose, from }: { onclose: () => void; from?: string } = $props()

  const source = from ? workspace.pack(from) : undefined
  const original = source ? manifestOf(source) : undefined
  let id = $state(original ? `${original.id ?? from}-mine` : '')
  let name = $state(
    original ? t('newPack.copyName', { name: original.name ?? original.id ?? '' }) : '',
  )
  let locale = $state<string>(original?.locale ?? getLocale())
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  function slug(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function create() {
    const packId = id.trim() || slug(name)
    if (!isValidId(packId)) return showToast(t('pack.invalidId'), 'error')
    if (workspace.pack(packId)) return showToast(t('newPack.idTaken', { id: packId }), 'error')
    workspace.addPack(
      source
        ? duplicatePack(source, packId, name.trim())
        : newPack(packId, name.trim(), locale.trim() || 'en'),
    )
    onclose()
    go({ name: 'pack', root: packId })
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
    <h2>{t(source ? 'newPack.duplicateTitle' : 'newPack.title')}</h2>
    {#if source}<p class="help">{t('newPack.duplicateHelp')}</p>{/if}
    <label class="field">
      <span>{t('newPack.name')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" bind:value={name} autofocus />
    </label>
    <label class="field">
      <span>{t('newPack.id')}<InfoTip text={t('newPack.idHelp')} /></span>
      <input type="text" bind:value={id} placeholder={slug(name)} />
    </label>
    {#if !source}
      <label class="field">
        <span>{t('newPack.locale')}<InfoTip text={t('newPack.localeHelp')} /></span>
        <input type="text" bind:value={locale} />
      </label>
    {/if}
    <div class="buttons">
      <button type="button" onclick={() => dialog.close()}>{t('newPack.cancel')}</button>
      <button type="submit" class="primary">{t('newPack.create')}</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: 360px;
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

  .help {
    margin: 0;
    font-size: 13px;
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
</style>
