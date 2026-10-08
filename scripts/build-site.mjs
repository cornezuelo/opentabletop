// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser. A build with the
// personal-use packs (OTT_PERSONAL_PACKS=1, `make serve`) goes to dist-local/ instead, so
// dist/ is always safe to publish. The root gets a small page linking to every app.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const out = process.env.OTT_PERSONAL_PACKS === '1' ? 'dist-local' : 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })

const ABOUT = {
  hexmapper: 'Draw hex maps and play trips on them',
  oracle: 'Roll and edit tables, oracles and packs',
  travel: 'Play trips without a map, edit travel systems',
  manual: 'The user manual of every app',
}
const links = apps
  .map(
    (app) =>
      `<li><a href="${app}/"><strong>${app[0].toUpperCase()}${app.slice(1)}</strong></a><span>${ABOUT[app] ?? ''}</span></li>`,
  )
  .join('\n      ')
writeFileSync(
  `${out}/index.html`,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenTabletop</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; padding: 48px 16px; color: #e8e2d4; background: #1b1a17; }
      main { max-width: 640px; margin: 0 auto; }
      h1 { margin: 0 0 6px; font-family: Georgia, serif; font-weight: normal; }
      p { margin: 0 0 28px; color: #9c9480; }
      ul { display: grid; gap: 10px; padding: 0; list-style: none; }
      li { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding: 14px 16px;
        background: #26241f; border: 1px solid #3a362d; border-radius: 8px; }
      a { color: #c8a24a; text-decoration: none; font-size: 17px; }
      a:hover { text-decoration: underline; }
      span { color: #9c9480; }
    </style>
  </head>
  <body>
    <main>
      <h1>OpenTabletop</h1>
      <p>Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline.</p>
      <ul>
      ${links}
      </ul>
    </main>
  </body>
</html>
`,
)
console.log(`${out}/: ${apps.join(', ')}`)
