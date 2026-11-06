<script lang="ts">
  import { parseDocument } from 'yaml'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import PairEditor from './PairEditor.svelte'
  import { MANIFEST_FILE } from './packs'

  /** What `pack.yaml` says that can change, folded, keeping its comments. */
  let { library, locale, root }: { library: PackLibrary; locale: string; root: string } = $props()
  const t = translator(() => locale)

  const editable = $derived(library.isEditable(root))
  const data = $derived(
    (parseDocument(library.readFile(root, MANIFEST_FILE) ?? '').toJS() ?? {}) as Record<
      string,
      unknown
    >,
  )
  const others = $derived(library.packs.map((p) => p.root).filter((id) => id !== root))

  function set(key: string, value: unknown) {
    const doc = parseDocument(library.readFile(root, MANIFEST_FILE) ?? '')
    const empty =
      value === undefined ||
      value === '' ||
      (typeof value === 'object' && !Object.keys(value!).length)
    if (empty) doc.delete(key)
    else doc.set(key, value)
    library.writeFile(root, MANIFEST_FILE, doc.toString())
  }
  const FIELDS = [
    ['name', 'pack.name'],
    ['version', 'pack.versionLabel'],
    ['license', 'pack.licenseLabel'],
    ['attribution', 'pack.attribution'],
  ] as const
</script>

<details>
  <summary>{t('pack.edit')}<InfoTip text={t('pack.editHelp')} /></summary>
  <div class="grid">
    {#each FIELDS as [key, label] (key)}
      <label>
        <span>{t(label)}</span>
        <input
          type="text"
          value={String(data[key] ?? '')}
          disabled={!editable}
          onchange={(e) => set(key, e.currentTarget.value.trim())}
        />
      </label>
    {/each}
    <div class="wide">
      <span>{t('pack.dependencies')}<InfoTip text={t('pack.dependenciesHelp')} /></span>
      <PairEditor
        value={data.dependencies}
        keys={others}
        fresh=">=0.1.0"
        keyLabel={t('pack.dependencyKey')}
        {locale}
        disabled={!editable}
        label={t('pack.dependencies')}
        onchange={(map) => set('dependencies', map)}
      />
    </div>
    <div class="wide">
      <span>{t('pack.aliases')}<InfoTip text={t('pack.aliasesHelp')} /></span>
      <PairEditor
        value={data.aliases}
        fresh=""
        keyLabel={t('pack.aliasKey')}
        {locale}
        disabled={!editable}
        label={t('pack.aliases')}
        onchange={(map) => set('aliases', map)}
      />
    </div>
  </div>
</details>

<style>
  summary {
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 16px;
    align-items: start;
    margin-top: 10px;
  }

  label,
  .wide {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .wide {
    grid-column: 1 / -1;
  }
</style>
