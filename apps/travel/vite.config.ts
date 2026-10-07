import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (e.g. site/travel/ next to the
  // other apps, so they share the user packs stored for that origin).
  base: './',
  plugins: [
    svelte(),
    pwa({
      name: 'OpenTabletop Travel',
      shortName: 'Travel',
      description: 'Play trips and edit travel systems.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5175 },
})
