import { login } from '~~/server/services/AuthService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { jwtSecret } = useRuntimeConfig()
  return await login(body, jwtSecret)
})
