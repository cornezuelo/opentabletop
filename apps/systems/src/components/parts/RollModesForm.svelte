<script lang="ts">
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import RecordRows from '../forms/RecordRows.svelte'

  /** Roll modes (`kind: roll-modes`) as rows: how many times a roll is made and which is kept. */
  let { doc }: { doc: PartDoc } = $props()

  const modes = $derived(Object.keys((doc.data().modes ?? {}) as Record<string, unknown>))
</script>

<section>
  <h3>{t('modes.title')}<InfoTip text={t('modes.help')} /></h3>
  <RecordRows
    {doc}
    at={['modes']}
    idLabel={t('forms.id')}
    suggestions={['advantage', 'disadvantage', 'careful']}
    template={{ repeat: 2, keep: 'highest' }}
    columns={[
      { field: 'name', label: t('modes.name'), type: 'text' },
      { field: 'description', label: t('modes.description'), type: 'text' },
      {
        field: 'repeat',
        label: t('modes.repeat'),
        help: t('modes.repeatHelp'),
        type: 'number',
        min: 1,
      },
      {
        field: 'keep',
        label: t('modes.keep'),
        help: t('modes.keepHelp'),
        type: 'select',
        choices: ['highest', 'lowest', 'middle'],
      },
      {
        field: 'cancels',
        label: t('modes.cancels'),
        help: t('modes.cancelsHelp'),
        type: 'list',
        choices: modes,
      },
    ]}
  />
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
</style>
