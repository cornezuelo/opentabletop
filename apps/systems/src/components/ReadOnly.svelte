<script lang="ts">
  import { BundledUpdates } from '@open-tabletop/pack-ui'
  import { confirmAction, Notice } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { library } from '../lib/packs.svelte'

  /**
   * On bundled packs: they can't change, but a copy can. On your edited copy of a
   * bundled pack: going back to the bundled version (undoable with ↶). Nothing otherwise.
   * A pack the system only brings along (`dependency`: Core's roll modes in another
   * system) offers no copy: it's shared by every system that brings it, and an edited
   * copy would fall behind its updates.
   */
  let { root, dependency = false }: { root: string; dependency?: boolean } = $props()
  const pack = $derived(library.pack(root))
  const personal = $derived(pack?.personal)

  async function revert() {
    if (await confirmAction(t('edit.confirmRevert'))) library.removePack(root)
  }
</script>

{#if pack?.origin === 'bundled' && dependency}
  <Notice>
    <span>{t('edit.dependency', { pack: root })}</span>
  </Notice>
{:else if pack?.origin === 'bundled'}
  <Notice>
    <span>{t('edit.readOnly')}{personal ? ` ${t('edit.personalCopy')}` : ''}</span>
    <button onclick={() => library.editCopy(root)}>{t('edit.makeCopy')}</button>
  </Notice>
{:else if pack?.overrides}
  <Notice>
    <span>{t('edit.editedCopy')}</span>
    <button class="plain" onclick={revert}>{t('edit.revert')}</button>
  </Notice>
  <BundledUpdates {library} {root} locale={getLocale()} />
{/if}
