<script lang="ts">
  import { PackNotice } from '@open-tabletop/pack-ui'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { manifestOf } from '../lib/packs/workspace'
  import { workspace } from '../lib/packs/workspace.svelte'
  import NewPackDialog from './NewPackDialog.svelte'

  /**
   * pack-ui's `PackNotice` on bundled packs (the pack's page shows its own revert). A pack
   * other packs depend on (Core) isn't copied (a copy would replace it for them, without its
   * updates): it's duplicated as a new pack of yours.
   */
  let { root }: { root: string } = $props()
  const pack = $derived(workspace.pack(root))
  const needed = $derived.by(() => {
    const id = pack && manifestOf(pack).id
    return !!id && [...workspace.registry.packs.values()].some((p) => p.dependencies.includes(id))
  })
  let duplicating = $state(false)
</script>

{#snippet duplicate()}
  <button use:tooltip={t('edit.duplicateHelp')} onclick={() => (duplicating = true)}
    >{t('edit.duplicate')}</button
  >
{/snippet}

<PackNotice
  library={workspace}
  {root}
  locale={getLocale()}
  edited={false}
  texts={{ readOnly: t('edit.readOnly') }}
  copy={needed ? duplicate : undefined}
/>
{#if duplicating}<NewPackDialog from={root} onclose={() => (duplicating = false)} />{/if}
