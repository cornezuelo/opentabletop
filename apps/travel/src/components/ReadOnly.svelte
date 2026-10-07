<script lang="ts">
  import { BundledUpdates } from '@open-tabletop/pack-ui'
  import { confirmAction } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { library } from '../lib/packs.svelte'

  /**
   * On bundled packs: they can't change, but a copy can. On your edited copy of a
   * bundled pack: going back to the bundled version (undoable with ↶). Nothing otherwise.
   */
  let { root }: { root: string } = $props()
  const pack = $derived(library.pack(root))
  const personal = $derived(pack?.personal)

  async function revert() {
    if (await confirmAction(t('edit.confirmRevert'))) library.removePack(root)
  }
</script>

{#if pack?.origin === 'bundled'}
  <div class="notice">
    <span>{t('edit.readOnly')}{personal ? ` ${t('edit.personalCopy')}` : ''}</span>
    <button onclick={() => library.editCopy(root)}>{t('edit.makeCopy')}</button>
  </div>
{:else if pack?.overrides}
  <div class="notice">
    <span>{t('edit.editedCopy')}</span>
    <button class="plain" onclick={revert}>{t('edit.revert')}</button>
  </div>
  <BundledUpdates {library} {root} locale={getLocale()} />
{/if}

<style>
  .notice {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  button {
    flex: none;
    padding: 5px 10px;
    color: var(--bg);
    background: var(--accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button.plain {
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
  }
</style>
