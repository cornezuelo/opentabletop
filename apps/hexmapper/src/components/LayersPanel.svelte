<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import LineIcon from './LineIcon.svelte'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { LAYER_IDS, LOCKABLE_LAYERS } from '../lib/model/types'
  import { collectSuggestions, hexesWithTag } from '../lib/model/hex'
  import { editor } from '../lib/store/editor.svelte'
  import { InfoTip } from '@open-tabletop/ui-kit'

  const tags = $derived.by(() => {
    void editor.revision
    return collectSuggestions(Object.values(editor.map.hexes)).tags
  })
  const found = $derived.by(() => {
    void editor.revision
    return hexesWithTag(editor.map, editor.highlightTag).length
  })
</script>

<ul>
  <!-- Top of the list = drawn on top, like image editors. -->
  {#each [...LAYER_IDS].reverse() as id (id)}
    {@const layer = editor.layers[id]}
    {@const name = t(`layers.names.${id}` as MessageKey)}
    <li class:hidden={!layer.visible}>
      <button
        class="toggle"
        aria-pressed={layer.visible}
        use:tooltip={layer.visible ? t('layers.hide') : t('layers.show')}
        aria-label="{layer.visible ? t('layers.hide') : t('layers.show')}: {name}"
        onclick={() => editor.setLayer(id, { visible: !layer.visible })}
        ><LineIcon name={layer.visible ? 'eye' : 'eye-off'} /></button
      >
      <span class="name">{name}</span>
      {#if LOCKABLE_LAYERS.includes(id)}
        <button
          class="toggle"
          class:on={layer.locked}
          aria-pressed={layer.locked}
          use:tooltip={layer.locked ? t('layers.unlock') : t('layers.lock')}
          aria-label="{layer.locked ? t('layers.unlock') : t('layers.lock')}: {name}"
          onclick={() => editor.setLayer(id, { locked: !layer.locked })}
          ><LineIcon name={layer.locked ? 'lock' : 'unlock'} /></button
        >
      {/if}
    </li>
  {/each}
</ul>

<section class="highlight">
  <label class="field">
    <span>{t('layers.highlight')}<InfoTip text={t('layers.highlightHelp')} /></span>
    <div class="row">
      <input
        type="text"
        list="highlight-tags"
        placeholder={tags[0] ?? 'landmark'}
        bind:value={editor.highlightTag}
      />
      <button
        class="toggle"
        disabled={!editor.highlightTag}
        use:tooltip={t('layers.clearHighlight')}
        aria-label={t('layers.clearHighlight')}
        onclick={() => (editor.highlightTag = '')}>✕</button
      >
    </div>
    <datalist id="highlight-tags">
      {#each tags as tag (tag)}<option value={tag}></option>{/each}
    </datalist>
  </label>
  <label class="check">
    <input type="checkbox" bind:checked={editor.highlightDim} />
    {t('layers.dimRest')}
  </label>
  {#if editor.highlightTag.trim()}
    <p class="help">{t('layers.highlighted', { count: found })}</p>
  {/if}
</section>

<style>
  .highlight {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }

  .highlight .row {
    display: flex;
    gap: 4px;
  }

  .highlight input[type='text'] {
    flex: 1;
    min-width: 0;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text);
  }

  li.hidden .name {
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .name {
    flex: 1;
  }

  .toggle {
    width: 28px;
    height: 26px;
    font-size: 13px;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.8;
  }

  .toggle:hover {
    border-color: var(--panel-border);
    opacity: 1;
  }

  .toggle.on {
    opacity: 1;
  }
</style>
