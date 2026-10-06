<script lang="ts">
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { RemoveTokenCommand } from '../../lib/commands/tokens'
  import { t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { DEFAULT_TOKEN_ICONS, tokenColor } from '../../lib/model/tokens'
  import { TOKEN_KINDS, type MapToken, type TokenKind } from '../../lib/model/types'
  import { partyMoved } from '../../lib/play/play'
  import { editor } from '../../lib/store/editor.svelte'
  import { view } from '../../lib/store/view'
  import ColorPicker from '../ColorPicker.svelte'
  import NoteRefInput from '../NoteRefInput.svelte'
  import TokenIconPicker from './TokenIconPicker.svelte'

  /** New tokens are characters or creatures; the party is placed from Play mode. */
  const PLACEABLE: TokenKind[] = ['pc', 'npc', 'enemy']

  const selected = $derived(
    editor.selectedToken ? editor.tokens.find((t) => t.id === editor.selectedToken) : undefined,
  )
  const groups = $derived(
    TOKEN_KINDS.map((kind) => ({
      kind,
      tokens: editor.tokens.filter((t) => t.kind === kind),
    })).filter((g) => g.tokens.length),
  )
  const coord = (hex: string) =>
    formatCoord(parseKey(hex as MapToken['hex'] & string), editor.grid.coordFormat, editor.grid)

  function setTemplateKind(kind: TokenKind) {
    const t = editor.tokenTemplate
    // Keep a custom icon; swap a default one for the new kind's.
    const iconId = Object.values(DEFAULT_TOKEN_ICONS).includes(t.iconId)
      ? DEFAULT_TOKEN_ICONS[kind]
      : t.iconId
    editor.tokenTemplate = { ...t, kind, iconId }
  }

  function update(change: (token: MapToken) => MapToken) {
    if (selected) editor.updateToken(selected.id, change)
  }

  /** Becoming the party demotes the current one: there is only one. */
  function setKind(kind: TokenKind) {
    if (!selected) return
    const party = editor.tokens.find((t) => t.kind === 'party' && t.id !== selected.id)
    if (kind === 'party' && party) editor.updateToken(party.id, (t) => ({ ...t, kind: 'pc' }))
    update((t) => ({ ...t, kind }))
  }

  function select(token: MapToken) {
    editor.selectedToken = token.id
    if (token.hex) view.centerOn(parseKey(token.hex))
  }

  function takeOff() {
    if (!selected) return
    update((t) => ({ ...t, hex: undefined }))
    if (selected.kind === 'party') partyMoved(undefined)
  }

  function remove() {
    if (!selected) return
    editor.execute(new RemoveTokenCommand(structuredClone(selected)))
    if (selected.kind === 'party') partyMoved(undefined)
    editor.selectedToken = null
  }
</script>

<p class="help">{t('tokens.help')}</p>

{#if selected}
  <div class="group">
    <div class="head">
      <strong>{selected.name || t(`tokens.kinds.${selected.kind}` as MessageKey)}</strong>
      <button class="link" onclick={() => (editor.selectedToken = null)}
        >{t('tokens.deselect')}</button
      >
    </div>
    <label class="field">
      <span>{t('tokens.name')}</span>
      <input
        type="text"
        value={selected.name}
        onchange={(e) => {
          const name = e.currentTarget.value
          update((t) => ({ ...t, name }))
        }}
      />
    </label>
    <div class="segmented" role="radiogroup" aria-label={t('tokens.kind')}>
      {#each TOKEN_KINDS as kind (kind)}
        <button
          role="radio"
          aria-checked={selected.kind === kind}
          class:active={selected.kind === kind}
          onclick={() => setKind(kind)}>{t(`tokens.kinds.${kind}` as MessageKey)}</button
        >
      {/each}
    </div>
    <TokenIconPicker
      value={selected.iconId}
      onchange={(iconId) => update((t) => ({ ...t, iconId }))}
    />
    <ColorPicker
      value={selected.color}
      auto
      onchange={(color) => update((t) => ({ ...t, color }))}
    />
    <label class="check">
      <input
        type="checkbox"
        checked={selected.halo !== false}
        onchange={(e) => {
          const halo = e.currentTarget.checked
          update((t) => ({ ...t, halo: halo ? undefined : false }))
        }}
      />
      {t('iconStyle.halo')}
    </label>
    <label class="field">
      <span>{t('tokens.note')}</span>
      <NoteRefInput
        value={selected.note ?? ''}
        placeholder={t('tokens.notePlaceholder')}
        label={t('tokens.note')}
        onchange={(note) => update((t) => ({ ...t, note: note.trim() || undefined }))}
      />
    </label>
    <p class="help">
      {selected.hex ? t('tokens.at', { hex: coord(selected.hex) }) : t('tokens.offMapHelp')}
    </p>
    <div class="actions">
      {#if selected.hex}
        <button onclick={takeOff}>{t('tokens.takeOff')}</button>
      {/if}
      <button class="danger" onclick={remove}>{t('tokens.delete')}</button>
    </div>
  </div>
{:else}
  <div class="group">
    <span class="title">{t('tokens.newTitle')}</span>
    <div class="segmented three" role="radiogroup" aria-label={t('tokens.kind')}>
      {#each PLACEABLE as kind (kind)}
        <button
          role="radio"
          aria-checked={editor.tokenTemplate.kind === kind}
          class:active={editor.tokenTemplate.kind === kind}
          onclick={() => setTemplateKind(kind)}>{t(`tokens.kinds.${kind}` as MessageKey)}</button
        >
      {/each}
    </div>
    <TokenIconPicker
      value={editor.tokenTemplate.iconId}
      onchange={(iconId) => (editor.tokenTemplate = { ...editor.tokenTemplate, iconId })}
    />
    <ColorPicker
      value={editor.tokenTemplate.color}
      auto
      onchange={(color) => (editor.tokenTemplate = { ...editor.tokenTemplate, color })}
    />
  </div>
{/if}

<div class="field">
  <span>{t('tokens.list')}</span>
  {#each groups as group (group.kind)}
    <span class="kind">{t(`tokens.kindsPlural.${group.kind}` as MessageKey)}</span>
    <ul>
      {#each group.tokens as token (token.id)}
        <li>
          <button class:active={token.id === editor.selectedToken} onclick={() => select(token)}>
            <span class="dot" style:background={tokenColor(token)}></span>
            <span class="name">{token.name || t(`tokens.kinds.${token.kind}` as MessageKey)}</span>
            <span class="where">{token.hex ? coord(token.hex) : t('tokens.offMap')}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="help">{t('tokens.empty')}</p>
  {/each}
</div>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: var(--bg);
    border-radius: 6px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .title,
  .kind {
    font-size: 12px;
    color: var(--text-muted);
  }

  .kind {
    margin-top: 4px;
  }

  .segmented {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .segmented.three {
    grid-template-columns: repeat(3, 1fr);
  }

  .segmented button,
  .actions button {
    padding: 5px 4px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .segmented button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .actions .danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li button {
    display: flex;
    gap: 6px;
    align-items: center;
    width: 100%;
    padding: 3px 4px;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  li button:hover,
  li button.active {
    background: rgb(200 162 74 / 0.12);
  }

  .dot {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .where {
    font-size: 11px;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
