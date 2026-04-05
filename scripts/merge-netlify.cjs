/**
 * After `vite build`, write marketing page to dist/landing.html and keep SPA at dist/app/.
 * Copies TLI_Logo.png from project root or public/ to dist root for /TLI_Logo.png.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const landingSrc = path.join(root, 'landing.html')
const logoRoot = path.join(root, 'TLI_Logo.png')
const logoPublic = path.join(root, 'public', 'TLI_Logo.png')

if (!fs.existsSync(path.join(dist, 'app', 'index.html'))) {
  console.error('[merge-netlify] dist/app/index.html missing — run vite build first.')
  process.exit(1)
}

if (!fs.existsSync(landingSrc)) {
  console.error('[merge-netlify] landing.html missing at project root.')
  process.exit(1)
}

fs.copyFileSync(landingSrc, path.join(dist, 'landing.html'))
console.log('[merge-netlify] Wrote dist/landing.html')

const logoSrc = fs.existsSync(logoRoot) ? logoRoot : logoPublic
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(dist, 'TLI_Logo.png'))
  console.log('[merge-netlify] Copied TLI_Logo.png → dist/TLI_Logo.png')
} else {
  console.warn('[merge-netlify] TLI_Logo.png not found at project root or public/')
}
