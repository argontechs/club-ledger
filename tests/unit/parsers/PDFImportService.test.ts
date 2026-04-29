// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parsePdfBuffer } from '~~/server/services/PDFImportService'

const fixture = fileURLToPath(new URL('../../fixtures/sample-import.pdf', import.meta.url))

describe('PDFImportService.parsePdfBuffer', () => {
  it('parses the Mok April fixture', async () => {
    const buf = await readFile(fixture)
    const r = await parsePdfBuffer(buf)
    expect(r.ambassadorHint).toMatch(/MOKKK/i)
    expect(r.headerTotal).toBeCloseTo(191827.39, 2)
    expect(r.rows.length).toBeGreaterThan(60)
    const sum = r.rows.reduce((a, x) => a + x.amount, 0)
    expect(Math.abs(sum - r.headerTotal)).toBeLessThan(0.05)
    expect(r.rows[0]).toMatchObject({
      date: '2026-04-01',
      externalOrderId: 'T260401230712002',
      tableNumber: 'L11',
      amount: 1454.55,
    })
  })

  it('skips RM - rows', async () => {
    const buf = await readFile(fixture)
    const r = await parsePdfBuffer(buf)
    expect(r.rows.every(x => x.amount > 0)).toBe(true)
  })
})
