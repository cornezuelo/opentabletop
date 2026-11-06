<script lang="ts">
  import { showToast } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { createSystem } from '../lib/newSystem'

  let { onclose }: { onclose: () => void } = $props()

  let name = $state('')
  let dialog: HTMLDialogElement

  $effect(() => {
    dialog.showModal()
  })

  function create() {
    if (!name.trim()) return
    const id = createSystem(name)
    if (!id) return showToast(t('library.nameTaken'), 'error')
    dialog.close()
    go({ name: 'system', id, tab: 'overview' })
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
    <h2>{t('library.newSystemTitle')}</h2>
    <p>{t('library.newSystemHelp')}</p>
    <label>
      <span>{t('library.newSystemName')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" autofocus bind:value={name} />
    </label>
    <div class="actions">
      <button type="button" class="button" onclick={() => dialog.close()}
        >{t('library.cancel')}</button
      >
      <button type="submit" class="button primary" disabled={!name.trim()}
        >{t('library.create')}</button
      >
    </div>
  </form>
</dialog>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(420px, 90vw);
  }

  h2,
  p {
    margin: 0;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
