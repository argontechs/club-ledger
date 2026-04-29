import { useDB, schema } from '~~/server/db/client'
export default defineEventHandler(() => useDB().select().from(schema.roles))
