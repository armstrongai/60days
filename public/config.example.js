/**
 * Optional local file-based config: copy to public/config.js (gitignored).
 * If you skip this, use a repo-root .env / .env.local with SUPABASE_URL and
 * SUPABASE_ANON_KEY — Vite injects them at dev and build (see vite.config.ts).
 *
 * Netlify: set the same two vars in the UI; npm run build generates public/config.js
 * from config.default.js when missing, then the inject step adds real keys.
 */
window.__45DAYS_CONFIG__ = Object.assign(window.__45DAYS_CONFIG__ || {}, {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
})

export {}
