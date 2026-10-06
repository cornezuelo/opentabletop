<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { definitionDoc } from '../../lib/packs/doc.svelte'
  import DeckEditor from './DeckEditor.svelte'
  import EntriesEditor from './EntriesEditor.svelte'
  import GeneratorEditor from './GeneratorEditor.svelte'
  import OracleEditor from './OracleEditor.svelte'
  import TextField from './TextField.svelte'

  /** Form editor of any definition: common texts and language, then its kind's form. */
  let { def, root }: { def: Compiled; root: string } = $props()

  const doc = definitionDoc(() => ({ def, root }))
  const dice = $derived(def.kind === 'table' || def.kind === 'oracle')
</script>

<div class="editor">
  <div class="top">
    <label class="field grow">
      <span>{t('edit.name')}</span>
      <TextField {doc} path={['name']} />
    </label>
    {#if dice}
      <label class="field dice">
        <span>{t('edit.roll')}<InfoTip text={t('edit.rollHelp')} /></span>
        <input
          type="text"
          value={doc.raw.roll ?? ''}
          disabled={doc.translating}
          onchange={(e) => doc.edit(['roll'], e.currentTarget.value.trim())}
        />
      </label>
    {/if}
    <label class="field lang">
      <span>{t('edit.language')}<InfoTip text={t('edit.translationHelp')} /></span>
      <select bind:value={doc.language}>
        <option value="">{t('edit.baseLanguage', { locale: doc.baseLocale })}</option>
        {#each doc.locales as l (l)}
          <option value={l}>{l}</option>
        {/each}
      </select>
    </label>
  </div>
  <label class="field">
    <span>{t('edit.description')}</span>
    <TextField {doc} path={['description']} />
  </label>

  {#if def.kind === 'table'}
    <EntriesEditor {doc} path={['entries']} rollPath={['roll']} />
  {:else if def.kind === 'oracle'}
    <OracleEditor {doc} />
  {:else if def.kind === 'generator'}
    <GeneratorEditor {doc} />
  {:else}
    <DeckEditor {doc} />
  {/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .top {
    display: flex;
    gap: 10px;
  }

  .grow {
    flex: 1;
  }

  .dice {
    width: 160px;
  }

  .lang {
    width: 140px;
  }

  .editor :global(.section-title) {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--accent);
  }

  .editor :global(.add-row) {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .editor :global(.add-row button),
  .editor :global(button.plain) {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .editor :global(.note) {
    font-size: 11px;
    color: #d8c58a;
  }
</style>
