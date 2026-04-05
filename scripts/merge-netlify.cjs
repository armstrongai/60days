/**
 * After `vite build`, assemble Netlify publish dir `dist/` (see netlify.toml publish = "dist"):
 * - SPA shell: dist/app/index.html → dist/app/app.html (no index.html under /app/)
 * - Patch workbox precache in dist/app/sw.js to reference app.html
 * - Marketing: copy publish/landing.html → dist/landing.html
 * - Logo: TLI_Logo.png at dist root
 * - Remove stray dist/index.html so "/" is never a static index file at publish root
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const landingSrc = path.join(root, 'publish', 'landing.html')
const logoRoot = path.join(root, 'TLI_Logo.png')
const logoPublic = path.join(root, 'public', 'TLI_Logo.png')

const appIndex = path.join(dist, 'app', 'index.html')
const appHtml = path.join(dist, 'app', 'app.html')

if (!fs.existsSync(appIndex)) {
  console.error('[merge-netlify] dist/app/index.html missing — run vite build first.')
  process.exit(1)
}

fs.renameSync(appIndex, appHtml)
console.log('[merge-netlify] Renamed dist/app/index.html → dist/app/app.html')

const swPath = path.join(dist, 'app', 'sw.js')
const swSrc = fs.readFileSync(swPath, 'utf8')
if (!swSrc.includes('"url":"index.html"')) {
  console.warn('[merge-netlify] sw.js: precache entry "url":"index.html" not found — check Workbox output')
} else {
  fs.writeFileSync(swPath, swSrc.replace('"url":"index.html"', '"url":"app.html"'))
  console.log('[merge-netlify] Patched sw.js precache URL index.html → app.html')
}

if (!fs.existsSync(landingSrc)) {
  console.error('[merge-netlify] publish/landing.html missing.')
  process.exit(1)
}

const strayRootIndex = path.join(dist, 'index.html')
if (fs.existsSync(strayRootIndex)) {
  fs.unlinkSync(strayRootIndex)
  console.log('[merge-netlify] Removed dist/index.html (homepage is /landing.html)')
}

const landingOut = path.join(dist, 'landing.html')
fs.copyFileSync(landingSrc, landingOut)
if (!fs.existsSync(landingOut)) {
  console.error('[merge-netlify] dist/landing.html missing immediately after copy.')
  process.exit(1)
}
const landingBytes = fs.statSync(landingOut).size
if (landingBytes < 500) {
  console.error('[merge-netlify] dist/landing.html is suspiciously small (' + landingBytes + ' bytes).')
  process.exit(1)
}
console.log('[merge-netlify] Copied publish/landing.html → dist/landing.html (' + landingBytes + ' bytes)')

// Same routing as repo-root netlify.toml, but shipped inside the publish dir so deploys always carry rules.
// Netlify reads netlify.toml from the repo (or base dir), not from dist — this file is a fallback if UI/summary looks wrong.
const redirectsOut = path.join(dist, '_redirects')
fs.writeFileSync(
  redirectsOut,
  [
    '/api/*\t/.netlify/functions/:splat\t200',
    '/app\t/app/app.html\t200',
    '/app/*\t/app/app.html\t200',
    '/\t/landing.html\t200!',
    '',
  ].join('\n'),
  'utf8',
)
console.log('[merge-netlify] Wrote dist/_redirects (/, /app, /api)')

const logoSrc = fs.existsSync(logoRoot) ? logoRoot : logoPublic
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(dist, 'TLI_Logo.png'))
  console.log('[merge-netlify] Copied TLI_Logo.png → dist/TLI_Logo.png')
} else {
  console.warn('[merge-netlify] TLI_Logo.png not found at project root or public/')
}
