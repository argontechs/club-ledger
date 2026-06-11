import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

function createDb() {
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
  return drizzle(pool, { schema, mode: 'default' })
}

let _db: ReturnType<typeof createDb> | null = null

export function useDB() {
  const db = _db ?? createDb()
  _db = db
  return db
}

export type DB = ReturnType<typeof useDB>
export { schema }
