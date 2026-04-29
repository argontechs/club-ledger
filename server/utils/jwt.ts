import jwt from 'jsonwebtoken'

export interface TokenPayload {
  sub: number
  role: string
  ambassador_id?: number | null
}

export function signToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '7d' })
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload
  return { sub: Number(decoded.sub), role: String(decoded.role), ambassador_id: decoded.ambassador_id ?? null }
}
