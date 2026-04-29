import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '~~/server/utils/jwt'

describe('jwt', () => {
  const secret = 'test-secret'
  it('round-trips a payload', () => {
    const token = signToken({ sub: 1, role: 'owner' }, secret)
    const decoded = verifyToken(token, secret)
    expect(decoded.sub).toBe(1)
    expect(decoded.role).toBe('owner')
  })
  it('rejects an invalid signature', () => {
    const token = signToken({ sub: 1, role: 'owner' }, secret)
    expect(() => verifyToken(token, 'other-secret')).toThrow()
  })
})
