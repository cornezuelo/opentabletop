// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser. A build with the
// personal-use packs (OTT_PERSONAL_PACKS=1, `make serve`) goes to dist-local/ instead, so
// dist/ is always safe to publish. The root gets a small page linking to every app.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { APP_BLURBS, APP_ICON_SVGS, APP_LIST, logoSvg } from '../packages/ui-kit/src/apps.data.mjs'
import { initialLocale, pickLocale } from '../packages/ui-kit/src/locale.mjs'

// The landing page's language buttons: a flag each, choosing the language every app shares.
const FLAGS = {
  en: `<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>`,
  es: `<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#AA151B"/><path d="M0 7.5h60v15H0z" fill="#F1BF00"/></svg>`,
}
const LANGUAGES = { en: 'English', es: 'Español' }
const REPO = 'https://github.com/cornezuelo/opentabletop'
const { version, license } = JSON.parse(readFileSync('package.json', 'utf8'))
// GitHub's mark (Octicons, MIT), for the link to the source.
const GITHUB_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`
/** A text in every language, switched by the script below. */
const both = (en, es) => `<span data-en="${en}" data-es="${es}">${en}</span>`

const out = process.env.OTT_PERSONAL_PACKS === '1' ? 'dist-local' : 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })

// The landing page lists the apps like the app switcher: its order, icons and descriptions
// (ui-kit's apps.data.mjs), in the language every app shares (ui-kit's locale.mjs), with
// flags to change it.
const listed = APP_LIST.filter((app) => apps.includes(app.id))
const items = listed
  .map(
    (app) => `<li>
        <a href="${app.id}/">
          ${APP_ICON_SVGS[app.id]}
          <span><strong>${app.name}</strong>
            <span data-en="${APP_BLURBS.en[app.id]}" data-es="${APP_BLURBS.es[app.id]}">${APP_BLURBS.en[app.id]}</span></span>
        </a>
      </li>`,
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
    <meta name="description" content="Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns." />
    <link rel="icon" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(true))}" />
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { display: flex; flex-direction: column; min-height: 100vh; margin: 0; padding: 0 16px;
        box-sizing: border-box; color: #e8e2d4; background: #1b1a17; }
      main, footer { width: 100%; max-width: 640px; margin: 0 auto; box-sizing: border-box; }
      main { flex: 1; padding: 48px 0 32px; }
      .brand { display: flex; gap: 16px; align-items: center; }
      .brand svg { width: 64px; height: 64px; }
      h1 { margin: 0; font-family: Georgia, serif; font-size: 34px; font-weight: normal; letter-spacing: 0.01em; }
      h1 span { color: #c8a24a; }
      .tagline { margin: 18px 0 28px; color: #9c9480; font-size: 16px; line-height: 1.5; }
      ul { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
      a { display: flex; gap: 14px; align-items: center; padding: 12px 14px; color: inherit;
        text-decoration: none; background: #26241f; border: 1px solid #3a362d; border-radius: 8px; }
      a:hover, a:focus-visible { border-color: #c8a24a; outline: none; }
      svg { flex: none; width: 44px; height: 44px; }
      a > span { display: flex; flex-direction: column; gap: 3px; }
      strong { color: #c8a24a; font-size: 17px; font-weight: 600; }
      a > span > span { color: #9c9480; }
      header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
      .langs { display: flex; gap: 6px; }
      .langs button { display: flex; padding: 3px; background: none; border: 1px solid transparent;
        border-radius: 4px; cursor: pointer; opacity: 0.55; }
      .langs button:hover, .langs button:focus-visible { opacity: 1; outline: none; border-color: #3a362d; }
      .langs button[aria-pressed='true'] { opacity: 1; border-color: #c8a24a; }
      .langs svg { width: 30px; height: 15px; border-radius: 2px; }
      h2 { margin: 32px 0 10px; font-size: 13px; font-weight: normal; text-transform: uppercase;
        letter-spacing: 0.06em; color: #9c9480; }
      .packs { grid-template-columns: 1fr 1fr; }
      .packs a { flex-direction: column; align-items: flex-start; gap: 4px; height: 100%; box-sizing: border-box;
        font-size: 14px; color: #9c9480; }
      .packs strong { font-size: 15px; }
      @media (max-width: 520px) { .packs { grid-template-columns: 1fr; } }
      footer { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; padding: 18px 0 28px;
        font-size: 13px; color: #9c9480; border-top: 1px solid #3a362d; }
      footer a { display: inline-flex; gap: 6px; padding: 0; color: #9c9480; background: none; border: none;
        border-radius: 0; text-decoration: none; }
      footer a:hover, footer a:focus-visible { color: #c8a24a; }
      footer svg { width: 16px; height: 16px; }
      footer .github { padding: 6px 12px; color: #e8e2d4; background: #26241f; border: 1px solid #3a362d;
        border-radius: 6px; }
      footer .github:hover, footer .github:focus-visible { color: #c8a24a; border-color: #c8a24a; }
      footer .version { margin-left: auto; }
      @media (max-width: 520px) { h1 { font-size: 28px; } .brand svg { width: 52px; height: 52px; }
        footer .version { margin-left: 0; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="brand">
          ${logoSvg()}
          <h1>Open<span>Tabletop</span></h1>
        </div>
        <nav class="langs" aria-label="Language / Idioma">
          ${Object.entries(LANGUAGES)
            .map(
              ([code, name]) =>
                `<button type="button" data-locale="${code}" lang="${code}" aria-label="${name}" aria-pressed="false">${FLAGS[code]}</button>`,
            )
            .join('\n          ')}
        </nav>
      </header>
      <p class="tagline" data-en="Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline." data-es="Herramientas libres para rol en solitario, hexcrawls y campañas sandbox. Todo funciona en tu navegador, sin conexión.">Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline.</p>
      <ul>
      ${items}
      </ul>
      <h2>${both('Comes with', 'Incluye')}</h2>
      <ul class="packs">
        <li><a href="manual/#/packs/core"><strong>Core</strong>
          ${both('Oracles and inspiration for any game: yes or no, action and theme, scene twists.', 'Oráculos e inspiración para cualquier partida: sí o no, acción y asunto, giros de escena.')}</a></li>
        <li><a href="manual/#/packs/grey-marches"><strong data-en="The Grey Marches" data-es="Las Marcas Grises">The Grey Marches</strong>
          ${both('A frontier setting to play straight away: an example map, travel rules, weather, a calendar and tables that work together.', 'Una ambientación de frontera para jugar ya: un mapa de ejemplo, reglas de viaje, clima, un calendario y tablas que funcionan juntas.')}</a></li>
      </ul>
    </main>
    <footer>
      <a class="github" href="${REPO}">${GITHUB_SVG}${both('Source code on GitHub', 'Código fuente en GitHub')}</a>
      <a href="${REPO}/issues">${both('Report a problem', 'Avisar de un problema')}</a>
      <a href="${REPO}/blob/main/LICENSE">${both(`Free software (${license})`, `Software libre (${license})`)}</a>
      <a class="version" href="${REPO}/blob/main/CHANGELOG.md">${both(`Version ${version} · what's new`, `Versión ${version} · novedades`)}</a>
    </footer>
    <script>
      ${pickLocale}
      ${initialLocale}
      const KEY = 'opentabletop.locale'
      const available = ${JSON.stringify(Object.keys(LANGUAGES))}
      function show(locale) {
        document.documentElement.lang = locale
        for (const el of document.querySelectorAll('[data-en]')) el.textContent = el.dataset[locale]
        for (const button of document.querySelectorAll('[data-locale]'))
          button.setAttribute('aria-pressed', String(button.dataset.locale === locale))
      }
      for (const button of document.querySelectorAll('[data-locale]'))
        button.addEventListener('click', () => {
          try {
            localStorage.setItem(KEY, button.dataset.locale)
          } catch {
            // Not remembered; it still applies now.
          }
          show(button.dataset.locale)
        })
      show(initialLocale([KEY], available, 'en'))
    </script>
  </body>
</html>
`,
)
console.log(`${out}/: ${apps.join(', ')}`)
