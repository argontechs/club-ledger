import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const password = process.env.NUXT_DB_PASSWORD ?? ''

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.NUXT_DB_HOST || 'localhost',
    port: Number(process.env.NUXT_DB_PORT || 3306),
    user: process.env.NUXT_DB_USER || 'root',
    ...(password ? { password } : {}),
    database: process.env.NUXT_DB_NAME || 'nonoclub',
  },
})
