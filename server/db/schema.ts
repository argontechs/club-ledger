import {
  mysqlTable, int, varchar, text, datetime, date, decimal,
  mysqlEnum, tinyint, primaryKey, index, char, json,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

const ts = () => ({
  createdAt: datetime('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
})
const softDelete = () => ({ deletedAt: datetime('deleted_at', { mode: 'date' }) })

export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 20 }).notNull().unique(),
  ...ts(),
})

export const teams = mysqlTable('teams', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  ...ts(),
  ...softDelete(),
})

export const ambassadors = mysqlTable('ambassadors', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  fullName: varchar('full_name', { length: 200 }),
  ic: varchar('ic', { length: 60 }),
  teamId: int('team_id'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('8.00').notNull(),
  isProtected: tinyint('is_protected').default(0).notNull(),
  bankName: varchar('bank_name', { length: 120 }),
  bankAccountNumber: varchar('bank_account_number', { length: 60 }),
  bankOwnerName: varchar('bank_owner_name', { length: 200 }),
  ...ts(),
  ...softDelete(),
})

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  roleId: int('role_id').notNull(),
  ambassadorId: int('ambassador_id'),
  ...ts(),
  ...softDelete(),
})

export const sales = mysqlTable('sales', {
  id: int('id').autoincrement().primaryKey(),
  date: date('date', { mode: 'string' }).notNull(),
  ambassadorId: int('ambassador_id').notNull(),
  type: mysqlEnum('type', ['Table', 'BGO']).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  status: mysqlEnum('status', ['draft', 'confirmed', 'voided']).default('draft').notNull(),
  confirmedCommissionRate: decimal('confirmed_commission_rate', { precision: 5, scale: 2 }),
  confirmedBonusRate: decimal('confirmed_bonus_rate', { precision: 5, scale: 2 }),
  externalOrderId: varchar('external_order_id', { length: 50 }),
  tableNumber: varchar('table_number', { length: 20 }),
  createdBy: int('created_by').notNull(),
  confirmedAt: datetime('confirmed_at', { mode: 'date' }),
  voidedAt: datetime('voided_at', { mode: 'date' }),
  ...ts(),
}, (t) => ({
  byDate: index('sales_by_date').on(t.date),
  byAmbassador: index('sales_by_ambassador').on(t.ambassadorId),
  byOrderId: index('sales_by_order_id').on(t.externalOrderId),
}))

export const payouts = mysqlTable('payouts', {
  id: int('id').autoincrement().primaryKey(),
  ambassadorId: int('ambassador_id').notNull(),
  periodMonth: char('period_month', { length: 7 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  receiptPaths: json('receipt_paths').$type<Array<{ path: string; name: string; size: number; mime: string }>>(),
  payslipPath: varchar('payslip_path', { length: 500 }),
  paidAt: datetime('paid_at', { mode: 'date' }),
  createdBy: int('created_by').notNull(),
  ...ts(),
}, (t) => ({
  byAmbMonth: index('payouts_by_amb_month').on(t.ambassadorId, t.periodMonth),
}))

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export type Role = typeof roles.$inferSelect
export type Team = typeof teams.$inferSelect
export type Ambassador = typeof ambassadors.$inferSelect
export type User = typeof users.$inferSelect
export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert
export type Payout = typeof payouts.$inferSelect
export type Setting = typeof settings.$inferSelect
