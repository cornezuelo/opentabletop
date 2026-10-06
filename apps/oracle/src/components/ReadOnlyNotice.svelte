<script lang="ts">
  import { t } from '../lib/i18n'
  import { workspace } from '../lib/packs/workspace.svelte'

  /** Shown on bundled packs: they can't change, but a copy can. */
  let { root }: { root: string } = $props()
  const personal = $derived(workspace.pack(root)?.personal)
</script>

<div class="notice">
  <span>{t('edit.readOnly')}{personal ? ` ${t('edit.personalCopy')}` : ''}</span>
  <button onclick={() => workspace.editCopy(root)}>{t('edit.makeCopy')}</button>
</div>

<style>
  .notice {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  button {
    flex: none;
    padding: 5px 10px;
    color: var(--bg);
    background: var(--accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
