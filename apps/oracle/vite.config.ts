import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (e.g. site/hexmapper/ next to
  // site/oracle/, so both share the user packs stored for that origin).
  base: './',
  plugins: [svelte()],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5174 },
})
