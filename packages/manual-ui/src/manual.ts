import { createManual } from './pages'

/** Every page of docs/manual, bundled at build time. */
const files = import.meta.glob('../../../docs/manual/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const manual = createManual(files, ['hexmapper', 'oracle', 'travel', 'technical'])
