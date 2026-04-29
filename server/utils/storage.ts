import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises'
import { join, dirname, resolve, normalize } from 'node:path'

const STORAGE_ROOT = process.env.NUXT_STORAGE_ROOT
  ? resolve(process.env.NUXT_STORAGE_ROOT)
  : resolve(process.cwd(), '.storage')

function safeJoin(...parts: string[]): string {
  const full = normalize(join(STORAGE_ROOT, ...parts))
  if (!full.startsWith(STORAGE_ROOT)) throw new Error('Path traversal blocked')
  return full
}

export async function saveFile(relPath: string, data: Buffer): Promise<string> {
  const abs = safeJoin(relPath)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, data)
  return relPath
}

export async function readFileFromStorage(relPath: string): Promise<Buffer> {
  return await readFile(safeJoin(relPath))
}

export async function deleteFromStorage(relPath: string): Promise<void> {
  try { await unlink(safeJoin(relPath)) } catch {}
}

export async function fileExists(relPath: string): Promise<boolean> {
  try { await stat(safeJoin(relPath)); return true } catch { return false }
}

export function storageRoot(): string { return STORAGE_ROOT }
