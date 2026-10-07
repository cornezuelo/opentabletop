import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (e.g. site/manual/).
  base: './',
  plugins: [
    svelte(),
    pwa({
      name: 'OpenTabletop Manual',
      shortName: 'Manual',
      description: 'How to use every OpenTabletop app.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5176 },
})
