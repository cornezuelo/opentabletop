<script lang="ts">
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { LAYER_IDS, LOCKABLE_LAYERS } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
</script>

<ul>
  {#each LAYER_IDS as id (id)}
    {@const layer = editor.layers[id]}
    {@const name = t(`layers.names.${id}` as MessageKey)}
    <li class:hidden={!layer.visible}>
      <button
        class="toggle"
        aria-pressed={layer.visible}
        title={layer.visible ? t('layers.hide') : t('layers.show')}
        aria-label="{layer.visible ? t('layers.hide') : t('layers.show')}: {name}"
        onclick={() => editor.setLayer(id, { visible: !layer.visible })}
        >{layer.visible ? '👁' : '◌'}</button
      >
      <span class="name">{name}</span>
      {#if LOCKABLE_LAYERS.includes(id)}
        <button
          class="toggle"
          class:on={layer.locked}
          aria-pressed={layer.locked}
          title={layer.locked ? t('layers.unlock') : t('layers.lock')}
          aria-label="{layer.locked ? t('layers.unlock') : t('layers.lock')}: {name}"
          onclick={() => editor.setLayer(id, { locked: !layer.locked })}
          >{layer.locked ? '🔒' : '🔓'}</button
        >
      {/if}
    </li>
  {/each}
</ul>

<style>
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
