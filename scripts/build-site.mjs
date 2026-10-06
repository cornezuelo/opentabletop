// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'

const out = 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })
console.log(`${out}/: ${apps.join(', ')}`)
