import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { packSources } from './vite.packs.ts'

export default defineConfig({
  plugins: [packSources(), svelte()],
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
  },
})
