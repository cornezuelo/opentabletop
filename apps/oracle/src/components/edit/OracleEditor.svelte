<script lang="ts">
  import { InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { renameKey, setIn } from '@open-tabletop/pack-ui/yaml'
  import { t } from '../../lib/i18n'
  import { slugify } from '../../lib/packs/definitions'
  import type { DefinitionDoc } from '../../lib/packs/doc.svelte'
  import EntriesEditor from './EntriesEditor.svelte'
  import TextField from './TextField.svelte'

  /**
   * An oracle: one input the player picks before rolling (e.g. the odds) and, for each of
   * its options, its own list of entries (a variant).
   */
  let { doc }: { doc: DefinitionDoc } = $props()

  interface RawVariant {
    roll?: string
    entries?: unknown[]
  }

  const id = $derived(doc.def.localId)
  const inputs = $derived(
    (doc.raw.inputs as Record<
      string,
      { options?: string[]; default?: string; label?: string; labels?: Record<string, string> }
    >) ?? {},
  )
  const input = $derived(Object.keys(inputs)[0] ?? 'odds')
  const options = $derived(inputs[input]?.options ?? [])
  const fallback = $derived(inputs[input]?.default ?? '')
  const label = $derived(inputs[input]?.label || input)
  const optionLabel = (option: string) => inputs[input]?.labels?.[option] || option
  const variants = $derived((doc.raw.variants as Record<string, RawVariant>) ?? {})
  let newOption = $state('')

  function renameInput(next: string) {
    const name = slugify(next)
    if (!name || name === input) return
    doc.save(renameKey(doc.content, id, ['inputs'], input, name))
  }

  function renameOption(i: number, next: string) {
    const from = options[i]
    const to = slugify(next)
    if (!to || to === from) return
    if (options.includes(to)) return showToast(t('edit.optionExists', { option: to }), 'error')
    let text = setIn(doc.content, id, ['inputs', input, 'options', i], to)
    text = renameKey(text, id, ['variants'], from, to)
    text = renameKey(text, id, ['inputs', input, 'labels'], from, to)
    if (fallback === from) text = setIn(text, id, ['inputs', input, 'default'], to)
    doc.save(text)
  }

  function removeOption(i: number) {
    const option = options[i]
    let text = setIn(
      doc.content,
      id,
      ['inputs', input, 'options'],
      options.filter((_, j) => j !== i),
    )
    text = setIn(text, id, ['variants', option], undefined)
    text = setIn(text, id, ['inputs', input, 'labels', option], undefined)
    if (fallback === option) text = setIn(text, id, ['inputs', input, 'default'], undefined)
    doc.save(text)
  }

  /** A new option starts as a copy of the first variant, ready to adjust. */
  function addOption() {
    const option = slugify(newOption)
    if (!newOption.trim()) return
    if (options.includes(option)) return showToast(t('edit.optionExists', { option }), 'error')
    let text = setIn(doc.content, id, ['inputs', input, 'options'], [...options, option])
    if (!variants[option]) text = setIn(text, id, ['variants', option], template())
    doc.save(text)
    newOption = ''
  }

  function template(): RawVariant {
    const first = Object.values(variants)[0]
    return first
      ? structuredClone(first)
      : {
          entries: [
            { id: 'yes', range: '1-3', result: 'Yes' },
            { id: 'no', range: '4-6', result: 'No' },
          ],
        }
  }

  function moveOption(i: number, to: number) {
    const next = [...options]
    const [o] = next.splice(i, 1)
    next.splice(to, 0, o)
    doc.edit(['inputs', input, 'options'], next)
  }
</script>

<div class="oracle">
  <div class="row">
    <label class="field input">
      <span>{t('edit.input')}<InfoTip text={t('edit.inputHelp')} /></span>
      <input
        type="text"
        value={input}
        disabled={doc.translating}
        onchange={(e) => renameInput(e.currentTarget.value)}
      />
    </label>
    <label class="field grow">
      <span>{t('edit.inputLabel')}<InfoTip text={t('edit.labelHelp')} /></span>
      <TextField {doc} path={['inputs', input, 'label']} placeholder={input} />
    </label>
    <label class="field">
      <span>{t('edit.default')}<InfoTip text={t('edit.defaultHelp')} /></span>
      <select
        value={fallback}
        disabled={doc.translating}
        onchange={(e) => doc.edit(['inputs', input, 'default'], e.currentTarget.value)}
      >
        <option value="">{t('edit.firstOption')}</option>
        {#each options as o (o)}<option value={o}>{optionLabel(o)}</option>{/each}
      </select>
    </label>
  </div>

  <div class="field">
    <span>{t('edit.options')}<InfoTip text={t('edit.optionsHelp')} /></span>
    <table class="options">
      <thead>
        <tr>
          <th>{t('edit.id')}</th>
          <th class="wide">{t('edit.optionLabel')}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each options as option, i (option)}
          <tr>
            <td class="id">
              <input
                type="text"
                value={option}
                disabled={doc.translating}
                onchange={(e) => renameOption(i, e.currentTarget.value)}
              />
            </td>
            <td
              ><TextField
                {doc}
                path={['inputs', input, 'labels', option]}
                placeholder={option}
              /></td
            >
            <td class="row-actions">
              <div>
                <button
                  class="icon"
                  aria-label={t('edit.moveUp')}
                  use:tooltip={t('edit.moveUp')}
                  disabled={i === 0 || doc.translating}
                  onclick={() => moveOption(i, i - 1)}>↑</button
                >
                <button
                  class="icon"
                  aria-label={t('edit.moveDown')}
                  use:tooltip={t('edit.moveDown')}
                  disabled={i === options.length - 1 || doc.translating}
                  onclick={() => moveOption(i, i + 1)}>↓</button
                >
                <button
                  class="icon"
                  aria-label={t('edit.remove')}
                  use:tooltip={t('edit.remove')}
                  disabled={options.length <= 1 || doc.translating}
                  onclick={() => removeOption(i)}>×</button
                >
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if !doc.translating}
      <form
        class="add-row"
        onsubmit={(e) => {
          e.preventDefault()
          addOption()
        }}
      >
        <input type="text" placeholder={t('edit.newOption')} bind:value={newOption} />
        <button type="submit">{t('edit.addOption')}</button>
      </form>
    {/if}
  </div>

  {#each options as option (option)}
    <h3 class="section-title">
      {t('edit.variant', { input: label, option: optionLabel(option) })}
    </h3>
    {#if variants[option]}
      <EntriesEditor
        {doc}
        path={['variants', option, 'entries']}
        rollPath={variants[option].roll !== undefined ? ['variants', option, 'roll'] : ['roll']}
      />
    {:else}
      <p class="note">
        {t('edit.missingVariant', { option })}
        {#if !doc.translating}
          <button class="link" onclick={() => doc.edit(['variants', option], template())}
            >{t('edit.createVariant')}</button
          >
        {/if}
      </p>
    {/if}
  {/each}
</div>

<style>
  .oracle {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .row {
    display: flex;
    gap: 10px;
  }

  .input {
    width: 200px;
  }

  .grow {
    flex: 1;
  }

  .options {
    width: 100%;
    max-width: 640px;
    border-collapse: collapse;
  }

  .options th {
    padding: 2px 4px;
    font-size: 12px;
    font-weight: normal;
    text-align: left;
  }

  .options td {
    padding: 2px 4px;
  }

  .options td :global(input) {
    width: 100%;
  }

  .options .id {
    width: 160px;
  }

  .row-actions {
    width: 1%;
  }

  .row-actions div {
    display: flex;
    gap: 2px;
  }

  .row-actions .icon {
    width: 24px;
    height: 28px;
  }

  .row-actions .icon:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
