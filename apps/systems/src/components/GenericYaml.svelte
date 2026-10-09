<script lang="ts">
  import { CodeEditor } from '@open-tabletop/pack-ui'
  import { t } from '../lib/i18n'
  import { genericYaml } from '../lib/newSystem'

  /**
   * The Generic rules as a pack would write them, read-only: they are built in (code, not
   * a pack), so this is a view of them, and a new system starts from the same.
   */
  const content = genericYaml()
</script>

<div class="yaml">
  <p class="help">{t('edit.genericYaml')}</p>
  <div class="code"><CodeEditor value={content} readonly /></div>
</div>

<style>
  .yaml {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }

  .help {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .code {
    flex: 1;
    min-height: 320px;
  }
</style>
