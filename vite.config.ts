import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function inject45DaysConfigFromEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const cfg: Record<string, string> = {}
  const url = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY
  if (url && anonKey) {
    cfg.supabaseUrl = url
    cfg.supabaseAnonKey = anonKey
  }
  const trialLink = env.STRIPE_TRIAL_PAYMENT_LINK?.trim()
  if (trialLink) cfg.stripeTrialPaymentLink = trialLink
  if (Object.keys(cfg).length === 0) return null
  const json = JSON.stringify(cfg)
  return `<script>window.__45DAYS_CONFIG__=Object.assign(window.__45DAYS_CONFIG__||{},${json});</script>`
}

// https://vite.dev/config/
// Netlify publish dir is dist/. Landing: dist/landing.html (from publish/landing.html). SPA shell: dist/app/app.html (renamed in merge-netlify.cjs).
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/app/' : '/',
  build: {
    outDir: mode === 'production' ? 'dist/app' : 'dist',
  },
  plugins: [
    react(),
    {
      name: 'inject-45days-config',
      transformIndexHtml(html) {
        const tag = inject45DaysConfigFromEnv(mode)
        if (!tag) return html
        return html.replace('</head>', `${tag}</head>`)
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: '45Days',
        short_name: '45Days',
        description:
          '45Days — a local-only caseload manager for Texas Educational Diagnosticians.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/app/',
        icons: [],
      },
    }),
  ],
}))
