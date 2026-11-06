<script lang="ts">
  import { InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import { duplicatePack, isValidId, newPack } from './packFiles'
  import { manifestOf } from './packs'

  /** With `from` (a pack's folder): a new pack of yours made from that one. */
  let {
    library,
    locale: uiLocale,
    onclose,
    onmade,
    from,
  }: {
    library: PackLibrary
    locale: string
    onclose: () => void
    /** The new pack, by its folder. */
    onmade: (root: string) => void
    from?: string
  } = $props()
  const t = translator(() => uiLocale)

  // A dialog opened for one pack: what it starts from is read once.
  // svelte-ignore state_referenced_locally
  const source = from ? library.pack(from) : undefined
  const original = source ? manifestOf(source) : undefined
  // svelte-ignore state_referenced_locally
  let id = $state(original ? `${original.id ?? from}-mine` : '')
  let name = $state(
    original ? t('newPack.copyName', { name: original.name ?? original.id ?? '' }) : '',
  )
  // svelte-ignore state_referenced_locally
  let locale = $state<string>(original?.locale ?? uiLocale)
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
    if (!isValidId(packId)) return showToast(t('newPack.invalidId'), 'error')
    if (library.pack(packId)) return showToast(t('newPack.idTaken', { id: packId }), 'error')
    library.addPack(
      source
        ? duplicatePack(source, packId, name.trim())
        : newPack(packId, name.trim(), locale.trim() || 'en'),
    )
    onclose()
    onmade(packId)
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
    <div class="dialog-buttons">
      <button type="button" onclick={() => dialog.close()}>{t('newPack.cancel')}</button>
      <button type="submit" class="primary">{t('newPack.create')}</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: 360px;
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
</style>
