import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDB() {
  if (_db) return _db
  const { db: cfg } = useRuntimeConfig()
  const pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectionLimit: 10,
    decimalNumbers: false,
  })
  _db = drizzle(pool, { schema, mode: 'default' })
  return _db
}

export type DB = ReturnType<typeof useDB>
export { schema }
