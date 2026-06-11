import { useAuthStore } from '~/stores/auth'
const PUBLIC = ['/login', '/setup']
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated && !PUBLIC.includes(to.path)) return navigateTo('/login')
  if (auth.isAuthenticated && to.path === '/login') return navigateTo('/')
})
