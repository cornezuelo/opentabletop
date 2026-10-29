<script lang="ts">
  import { Notice, tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { manifestOf } from '../lib/packs/workspace'
  import { workspace } from '../lib/packs/workspace.svelte'
  import NewPackDialog from './NewPackDialog.svelte'

  /**
   * Shown on bundled packs: they can't change, but a copy can. A pack other packs depend
   * on (Core) isn't copied (a copy would replace it for them, without its updates): it's
   * duplicated as a new pack of yours.
   */
  let { root }: { root: string } = $props()
  const pack = $derived(workspace.pack(root))
  const personal = $derived(pack?.personal)
  const needed = $derived.by(() => {
    const id = pack && manifestOf(pack).id
    return !!id && [...workspace.registry.packs.values()].some((p) => p.dependencies.includes(id))
  })
  let duplicating = $state(false)
</script>

<Notice>
  <span>{t('edit.readOnly')}{personal ? ` ${t('edit.personalCopy')}` : ''}</span>
  {#if needed}
    <button use:tooltip={t('edit.duplicateHelp')} onclick={() => (duplicating = true)}
      >{t('edit.duplicate')}</button
    >
  {:else}
    <button onclick={() => workspace.editCopy(root)}>{t('edit.makeCopy')}</button>
  {/if}
</Notice>
{#if duplicating}<NewPackDialog from={root} onclose={() => (duplicating = false)} />{/if}
