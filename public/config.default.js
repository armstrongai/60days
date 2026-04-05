/**
 * Fallback when public/config.js is absent (CI / Netlify).
 * Netlify build injects real keys via vite.config.ts; this file does not overwrite them.
 * For local secrets: copy config.example.js → config.js (gitignored).
 */
window.__45DAYS_CONFIG__ = Object.assign(window.__45DAYS_CONFIG__ || {}, {})

export {}
