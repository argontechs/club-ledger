import { and, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const SaleTypeRepo = {
  listByClub(clubId: number) {
    return useDB().select().from(schema.saleTypes)
      .where(eq(schema.saleTypes.clubId, clubId))
      .orderBy(schema.saleTypes.sortOrder, schema.saleTypes.id)
  },
  findById(id: number) {
    return useDB().select().from(schema.saleTypes).where(eq(schema.saleTypes.id, id)).limit(1).then(r => r[0])
  },
  insert(values: { clubId: number; name: string; sortOrder?: number }) {
    return useDB().insert(schema.saleTypes).values({
      clubId: values.clubId, name: values.name, sortOrder: values.sortOrder ?? 0,
    })
  },
  update(id: number, patch: Partial<{ name: string; sortOrder: number; isActive: number }>) {
    return useDB().update(schema.saleTypes).set({ ...patch, updatedAt: new Date() }).where(eq(schema.saleTypes.id, id))
  },
  delete(id: number) {
    return useDB().delete(schema.saleTypes).where(eq(schema.saleTypes.id, id))
  },
}
