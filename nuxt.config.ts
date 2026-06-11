import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-29',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  runtimeConfig: {
    jwtSecret: process.env.NUXT_JWT_SECRET || 'dev-secret-change-me',
    db: {
      host: process.env.NUXT_DB_HOST || 'localhost',
      port: Number(process.env.NUXT_DB_PORT || 3306),
      user: process.env.NUXT_DB_USER || 'root',
      password: process.env.NUXT_DB_PASSWORD || '',
      database: process.env.NUXT_DB_NAME || 'nonoclub',
    },
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: { hmr: { overlay: false } },
  },
  routeRules: {
    '/**': { appMiddleware: ['auth'] },
  },
  app: {
    head: {
      // Runtime title follows the active club (set in app.vue); this is the
      // pre-hydration fallback, overridable per deployment.
      title: process.env.NUXT_PUBLIC_APP_NAME || 'Club Ledger',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&display=swap',
        },
      ],
    },
  },
})
