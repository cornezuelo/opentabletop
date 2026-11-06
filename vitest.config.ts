import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { packSources } from './vite.packs.ts'

export default defineConfig({
  plugins: [packSources(), svelte()],
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Tests that load the bundled packs take seconds on a busy machine.
    testTimeout: 30_000,
  },
})
