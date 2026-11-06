<script lang="ts">
  import { PackNotice } from '@open-tabletop/pack-ui'
  import { getLocale, t } from '../lib/i18n'
  import { library } from '../lib/packs.svelte'

  /**
   * pack-ui's `PackNotice` worded for a system. A bundled system isn't copied in place here:
   * the system's **Duplicate** (beside its name) makes an independent one of yours. A pack the
   * system only brings along (`dependency`: Core's roll modes in another system) offers no
   * copy: it's shared by every system that brings it.
   */
  let { root, dependency = false }: { root: string; dependency?: boolean } = $props()
</script>

<PackNotice
  {library}
  {root}
  locale={getLocale()}
  dependency={dependency ? t('edit.dependency', { pack: root }) : undefined}
  texts={{
    readOnly: t('edit.readOnly'),
    editedCopy: t('edit.editedCopy'),
    confirmRevert: t('edit.confirmRevert'),
    copyHelp: t('edit.duplicateHelp'),
  }}
>
  {#snippet copy()}{/snippet}
</PackNotice>
