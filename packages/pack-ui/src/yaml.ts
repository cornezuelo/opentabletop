import {
  Document,
  isMap,
  isSeq,
  isScalar,
  LineCounter,
  Pair,
  parseAllDocuments,
  parseDocument,
  stringify,
  YAMLMap,
  YAMLSeq,
} from 'yaml'

/**
 * Edits YAML pack files through the yaml Document API, so comments, key order and the
 * rest of the file survive structured edits.
 */

type Path = (string | number)[]

/** The `id` of a definition node, if it's a map with a string id. */
function idOf(node: unknown): string | undefined {
  if (!isMap(node)) return undefined
  const id: unknown = node.get('id')
  return typeof id === 'string' ? id : undefined
}

interface Found {
  docs: Document.Parsed[]
  doc: Document.Parsed
  /** Path of the definition inside its document ([] or [index] for list files). */
  prefix: Path
}

function find(content: string, localId: string): Found | undefined {
  const docs = parseAllDocuments(content) as Document.Parsed[]
  if (!Array.isArray(docs)) return undefined
  for (const doc of docs) {
    const root = doc.contents
    if (idOf(root) === localId) return { docs, doc, prefix: [] }
    if (isSeq(root)) {
      const index = root.items.findIndex((item) => idOf(item) === localId)
      if (index >= 0) return { docs, doc, prefix: [index] }
    }
  }
  return undefined
}

const write = (docs: Document.Parsed[]) => docs.map((d) => d.toString()).join('')

/** Definition ids declared in a file, in order. */
export function definitionIds(content: string): string[] {
  try {
    const docs = parseAllDocuments(content)
    if (!Array.isArray(docs)) return []
    return docs.flatMap((doc) => {
      const root = doc.contents
      const items = isSeq(root) ? root.items : [root]
      return items.flatMap((item) => {
        const id = idOf(item)
        return id ? [id] : []
      })
    })
  } catch {
    return []
  }
}

/** The raw (JS) definition with that id, as written in the file. */
export function readDefinition(
  content: string,
  localId: string,
): Record<string, unknown> | undefined {
  const found = find(content, localId)
  if (!found) return undefined
  const node = found.prefix.length ? found.doc.getIn(found.prefix, true) : found.doc.contents
  return (node as { toJSON?: () => unknown })?.toJSON?.() as Record<string, unknown>
}

/** Sets (or, with undefined/'' , deletes) a value inside a definition. */
export function setIn(content: string, localId: string, path: Path, value: unknown): string {
  const found = find(content, localId)
  if (!found) return content
  const full = [...found.prefix, ...path]
  if (value === undefined || value === '') found.doc.deleteIn(full)
  else found.doc.setIn(full, value)
  return write(found.docs)
}

function seqAt(found: Found, path: Path): YAMLSeq | undefined {
  const node = found.doc.getIn([...found.prefix, ...path], true)
  return isSeq(node) ? node : undefined
}

export function insertIn(
  content: string,
  localId: string,
  path: Path,
  index: number,
  value: unknown,
): string {
  const found = find(content, localId)
  const seq = found && seqAt(found, path)
  if (!found || !seq) return content
  seq.items.splice(index, 0, found.doc.createNode(value))
  return write(found.docs)
}

export function removeIn(content: string, localId: string, path: Path, index: number): string {
  const found = find(content, localId)
  const seq = found && seqAt(found, path)
  if (!found || !seq) return content
  seq.items.splice(index, 1)
  return write(found.docs)
}

export function moveIn(
  content: string,
  localId: string,
  path: Path,
  from: number,
  to: number,
): string {
  const found = find(content, localId)
  const seq = found && seqAt(found, path)
  if (!found || !seq || to < 0 || to >= seq.items.length) return content
  const [item] = seq.items.splice(from, 1)
  seq.items.splice(to, 0, item)
  return write(found.docs)
}

function mapAt(found: Found, path: Path): YAMLMap | undefined {
  const node = found.doc.getIn([...found.prefix, ...path], true)
  return isMap(node) ? node : undefined
}

const keyOf = (pair: Pair) => (isScalar(pair.key) ? String(pair.key.value) : String(pair.key))

/** Renames a key of a map inside a definition, keeping its position, value and comments. */
export function renameKey(
  content: string,
  localId: string,
  path: Path,
  from: string,
  to: string,
): string {
  const found = find(content, localId)
  const map = found && mapAt(found, path)
  if (!found || !map || from === to || map.has(to)) return content
  const pair = map.items.find((p) => keyOf(p) === from)
  if (!pair) return content
  pair.key = found.doc.createNode(to)
  return write(found.docs)
}

/** Moves a key of a map inside a definition to another position (maps keep their order). */
export function moveKey(
  content: string,
  localId: string,
  path: Path,
  key: string,
  to: number,
): string {
  const found = find(content, localId)
  const map = found && mapAt(found, path)
  if (!found || !map) return content
  const from = map.items.findIndex((p) => keyOf(p) === key)
  if (from < 0 || to < 0 || to >= map.items.length) return content
  const [pair] = map.items.splice(from, 1)
  map.items.splice(to, 0, pair)
  return write(found.docs)
}

/** A free id based on `base` ("weather" → "weather-copy", "weather-copy-2"…). */
export function freeId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Appends a definition: into a list file's list, or as a new `---` document. */
export function appendDefinition(content: string, definition: Record<string, unknown>): string {
  if (!content.trim()) return stringify(definition)
  const docs = parseAllDocuments(content) as Document.Parsed[]
  if (Array.isArray(docs)) {
    const last = docs.at(-1)
    if (last && isSeq(last.contents)) {
      ;(last.contents.items as unknown[]).push(last.createNode(definition))
      return write(docs)
    }
  }
  return `${content.replace(/\n*$/, '\n')}---\n${stringify(definition)}`
}

/** Removes a definition from its file. */
export function removeDefinition(content: string, localId: string): string {
  const found = find(content, localId)
  if (!found) return content
  if (found.prefix.length) {
    ;(found.doc.contents as YAMLSeq).items.splice(found.prefix[0] as number, 1)
    return write(found.docs)
  }
  const docs = found.docs.filter((d) => d !== found.doc)
  return docs.map((d, i) => (i === 0 ? d.toString().replace(/^---\n/, '') : d.toString())).join('')
}

/** Sets one text of a translation overlay (`<defId>.<field>[.<key>]`), creating the file as needed. */
export function setOverlayText(content: string, path: string[], text: string): string {
  const doc = content.trim() ? parseDocument(content) : new Document({})
  if (text) doc.setIn(path, text)
  else doc.deleteIn(path)
  return doc.toString()
}

/** Reads one text of a translation overlay. */
export function getOverlayText(content: string | undefined, path: string[]): string {
  if (!content?.trim()) return ''
  try {
    const value = parseDocument(content).getIn(path)
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

/**
 * Line (1-based) of an engine diagnostic location such as "encounters.entries[3].range"
 * (definition id first) or "pack.version" (manifest).
 */
export function locate(content: string, at: string | undefined): number | undefined {
  if (!at) return undefined
  const parts = at.split(/\.|\[(\d+)\]/).filter((p) => p !== undefined && p !== '')
  const path: Path = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : p))
  const head = String(path[0])
  const lineCounter = new LineCounter()
  const docs = parseAllDocuments(content, { lineCounter }) as Document.Parsed[]
  if (!Array.isArray(docs)) return undefined
  let doc: Document.Parsed | undefined
  let prefix: Path = []
  const rest = path.slice(1)
  if (head === 'pack') doc = docs[0]
  else if (head.startsWith('#')) doc = docs[0]
  else if (head.startsWith('@'))
    // `@kind`: the definition with that kind (e.g. travel-rules and bindings sharing an id).
    doc = docs.find(
      (d) => isMap(d.contents) && (d.contents.get('kind') as unknown) === head.slice(1),
    )
  else {
    for (const d of docs) {
      const root = d.contents
      if (idOf(root) === head) {
        doc = d
        break
      }
      if (isSeq(root)) {
        const index = root.items.findIndex((item) => idOf(item) === head)
        if (index >= 0) {
          doc = d
          prefix = [index]
          break
        }
      }
    }
  }
  if (!doc) return undefined
  // Walk down as far as the path exists, so a missing key points at its parent.
  for (let n = rest.length; n >= 0; n--) {
    const node = doc.getIn([...prefix, ...rest.slice(0, n)], true) as
      { range?: [number, number, number] } | undefined
    const range =
      n === 0 && !prefix.length
        ? (doc.contents as { range?: [number, number, number] })?.range
        : node?.range
    if (range) return lineCounter.linePos(range[0]).line
  }
  return undefined
}
