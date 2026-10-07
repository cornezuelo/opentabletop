import { defineConfig } from 'vite'

// One self-contained Node script: the packages are TypeScript sources, bundled in.
export default defineConfig({
  build: {
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node22',
    rolldownOptions: { output: { entryFileNames: 'opentabletop.mjs' } },
  },
  ssr: { noExternal: true },
})
