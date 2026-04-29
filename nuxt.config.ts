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
})
