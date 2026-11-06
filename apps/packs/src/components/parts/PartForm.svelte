<script lang="ts">
  import { seasonsFor, type TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import type { PartTabKind } from '../../lib/newSystem'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import { sheetScope } from '../../lib/usage'
  import BestiaryForm from './BestiaryForm.svelte'
  import CalendarForm from './CalendarForm.svelte'
  import ClocksForm from './ClocksForm.svelte'
  import FactionsForm from './FactionsForm.svelte'
  import ItemsForm from './ItemsForm.svelte'
  import LandForm from './LandForm.svelte'
  import PlacesForm from './PlacesForm.svelte'
  import RollModesForm from './RollModesForm.svelte'
  import SheetForm from './SheetForm.svelte'
  import WeatherForm from './WeatherForm.svelte'
  import WorldForm from './WorldForm.svelte'

  /**
   * The form of one definition of a kind. `system` is the one it's read with: what the form
   * suggests (terrains, seasons, sheets) comes from there.
   */
  let {
    doc,
    system,
    kind,
    id,
    item,
  }: { doc: PartDoc; system: TravelSystem; kind: PartTabKind; id: string; item?: string } = $props()

  const data = $derived(doc.data())
  /** A sheet's form has it already; a file of roll modes is many definitions, each with its own. */
  const described = $derived(kind !== 'sheet' && kind !== 'roll-modes')
</script>

{#if described}
  <label class="description">
    <span>{t('forms.description')}<InfoTip text={t('forms.partDescriptionHelp')} /></span>
    <textarea
      rows="2"
      value={doc.text('', data.description, ['description'])}
      placeholder={doc.translating ? doc.baseText(data.description) : ''}
      disabled={!doc.editable}
      onchange={(e) =>
        doc.setText('', ['description'], data.description, ['description'], e.currentTarget.value)}
    ></textarea>
  </label>
{/if}

{#if kind === 'calendar'}
  <CalendarForm {doc} {system} />
{:else if kind === 'factions'}
  <FactionsForm {doc} {system} />
{:else if kind === 'clocks'}
  <ClocksForm {doc} {system} />
{:else if kind === 'world'}
  <WorldForm {doc} {system} />
{:else if kind === 'items'}
  <ItemsForm {doc} {system} />
{:else if kind === 'bestiary'}
  <BestiaryForm {doc} {system} {id} {item} />
{:else if kind === 'places'}
  <PlacesForm {doc} />
{:else if kind === 'sheet'}
  <SheetForm {doc} {system} scope={sheetScope(system, id)} />
{:else if kind === 'weather'}
  <WeatherForm {doc} seasons={seasonsFor(system)} />
{:else if kind === 'land'}
  <LandForm {doc} {system} />
{:else}
  <RollModesForm {doc} {system} />
{/if}

<style>
  .description {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 760px;
    margin-bottom: 14px;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
