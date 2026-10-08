<script lang="ts">
  import FieldEditor from '../FieldEditor.svelte'
  import { InfoTip, confirmAction } from '@open-tabletop/ui-kit'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { RemoveTokenCommand } from '../../lib/commands/tokens'
  import { t, t as tr, type MessageKey } from '../../lib/i18n/index.svelte'
  import { DEFAULT_TOKEN_ICONS, tokenColor } from '../../lib/model/tokens'
  import { TOKEN_KINDS, type MapToken, type TokenKind } from '../../lib/model/types'
  import { partyChanged, partyMoved } from '../../lib/play/play'
  import { editor } from '../../lib/store/editor.svelte'
  import { view } from '../../lib/store/view'
  import ColorPicker from '../ColorPicker.svelte'
  import NoteRefInput from '../NoteRefInput.svelte'
  import NameDisplay from '../NameDisplay.svelte'
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

  /**
   * Changing the kind keeps the token's look: an automatic color is fixed first, since
   * the automatic one depends on the kind. Becoming the party demotes the current one.
   */
  async function setKind(kind: TokenKind) {
    if (!selected || selected.kind === kind) return
    const trip = !!editor.play?.rules?.session
    const party = editor.tokens.find((t) => t.kind === 'party' && t.id !== selected.id)
    const name = (t: MapToken) => t.name || tr(`tokens.kinds.${t.kind}` as MessageKey)
    if (kind === 'party' && (party || trip)) {
      const message = trip ? 'tokens.confirmPartyTrip' : 'tokens.confirmParty'
      if (
        !(await confirmAction(tr(message, { name: name(selected), old: party ? name(party) : '' })))
      )
        return
    }
    if (selected.kind === 'party' && trip && !(await confirmAction(tr('tokens.confirmNoParty'))))
      return
    const keepColor = (t: MapToken): MapToken => ({ ...t, color: tokenColor(t, editor.tokens) })
    const wasParty = selected.kind === 'party'
    if (kind === 'party' && party)
      editor.updateToken(party.id, (t) => ({ ...keepColor(t), kind: 'pc' }))
    update((t) => ({ ...keepColor(t), kind }))
    // The trip follows the party token.
    if (kind === 'party' || wasParty) partyChanged()
  }

  /** The token before a slider drag: the drag previews live and is recorded once. */
  let before: MapToken | null = null

  function restyle(nameStyle: MapToken['nameStyle'], live: boolean) {
    if (!selected) return
    const id = selected.id
    before ??= structuredClone(editor.getToken(id)!)
    editor.map.tokens = editor.map.tokens.map((t) => (t.id === id ? { ...t, nameStyle } : t))
    editor.notify({ kind: 'tokens' })
    if (live) return
    const after = structuredClone(editor.getToken(id)!)
    const start = before
    before = null
    editor.map.tokens = editor.map.tokens.map((t) => (t.id === id ? start : t))
    editor.updateToken(id, () => after)
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

  async function remove() {
    if (!selected) return
    const trip = selected.kind === 'party' && !!editor.play?.rules?.session
    const name = selected.name || tr(`tokens.kinds.${selected.kind}` as MessageKey)
    if (
      !(await confirmAction(
        tr(trip ? 'tokens.confirmDeleteParty' : 'tokens.confirmDelete', { name }),
      ))
    )
      return
    editor.execute(new RemoveTokenCommand(structuredClone(selected)))
    if (selected.kind === 'party') partyMoved(undefined)
    editor.selectedToken = null
  }
</script>

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
      onchange={(iconId) => iconId && update((t) => ({ ...t, iconId }))}
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
      {t('iconStyle.halo')}<InfoTip text={t('iconStyle.haloHelp')} />
    </label>
    <NameDisplay
      kind="tokenNames"
      show={!!selected.showName}
      style={selected.nameStyle}
      onshow={(show) => update((t) => ({ ...t, showName: show || undefined }))}
      onstyle={(nameStyle, live) => restyle(nameStyle, live)}
    />
    <label class="field">
      <span>{t('tokens.note')}</span>
      <NoteRefInput
        value={selected.note ?? ''}
        placeholder={t('tokens.notePlaceholder')}
        label={t('tokens.note')}
        onchange={(note) => update((t) => ({ ...t, note: note.trim() || undefined }))}
      />
    </label>
    <FieldEditor
      scope="token"
      fields={selected.fields ?? []}
      help={tr('fields.tokenHelp')}
      onchange={(fields) => update((t) => ({ ...t, fields: fields.length ? fields : undefined }))}
    />
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
      onchange={(iconId) => iconId && (editor.tokenTemplate = { ...editor.tokenTemplate, iconId })}
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
            <span class="dot" style:background={tokenColor(token, editor.tokens)}></span>
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

<p class="help">{t('tokens.help')}</p>

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
