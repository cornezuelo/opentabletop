<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { ReplacePathCommand } from '../../lib/commands/paths'
  import { t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { normalizePath } from '../../lib/model/hex'
  import type { HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'

  let { key }: { key: HexKey } = $props()

  const paths = $derived.by(() => {
    void editor.revision
    return editor.map.paths.filter((p) => p.hexes.includes(key))
  })
</script>

{#if paths.length > 0}
  <div class="field">
    <span>{t('hex.paths')}</span>
    <ul>
      {#each paths as path (path.id)}
        <li>
          <span class="kind {path.kind}"></span>
          <span class="name">{t(`pathKinds.${path.kind}` as MessageKey)}</span>
          <span class="muted">{t('hex.pathLength', { count: path.hexes.length })}</span>
          <button
            class="link"
            onclick={() =>
              editor.execute(
                new ReplacePathCommand(path, normalizePath({ ...path, straight: !path.straight })),
              )}>{path.straight ? t('path.makeCurved') : t('path.makeStraight')}</button
          >
          <button
            class="link"
            onclick={() =>
              editor.execute(
                new ReplacePathCommand(path, normalizePath({ ...path, closed: !path.closed })),
              )}>{path.closed ? t('path.makeOpen') : t('path.makeClosed')}</button
          >
          <button
            class="icon"
            use:tooltip={t('hex.remove')}
            aria-label="{t('hex.remove')}: {t(`pathKinds.${path.kind}` as MessageKey)}"
            onclick={() => editor.execute(new ReplacePathCommand(path, null))}>✕</button
          >
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
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

  .name {
    flex: 1;
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }

  .kind {
    width: 18px;
    height: 4px;
    background: #6e4f2c;
    border-radius: 2px;
  }

  .kind.river {
    height: 6px;
    background: #3f78a8;
  }

  .kind.trail {
    background: repeating-linear-gradient(90deg, #6e4f2c 0 5px, transparent 5px 8px);
  }

  .kind.border {
    height: 3px;
    background: repeating-linear-gradient(90deg, #8b1e1e 0 7px, transparent 7px 9px);
  }

  .kind.wall {
    height: 6px;
    background: #3a3631;
  }

  .icon {
    height: 26px;
  }
</style>
