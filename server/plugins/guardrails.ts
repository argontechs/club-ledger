// Production guardrails — refuse to boot with the development JWT secret.
export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return
  const { jwtSecret } = useRuntimeConfig()
  if (!jwtSecret || jwtSecret === 'dev-secret-change-me') {
    throw new Error('NUXT_JWT_SECRET must be set to a strong random value in production')
  }
})
