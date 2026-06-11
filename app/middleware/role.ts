import { useAuthStore } from '~/stores/auth'
import { routeModules } from '~/config/sidebarNav'
import { can } from '~~/shared/permissions'

// Page gate: maps the route to its permission module and checks view access
// (the 'access' surface stays admin-tier). The server enforces the same rules
// on every endpoint — this only prevents dead-end navigation.
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const u = auth.user as any
  if (!u) return
  const module = routeModules[to.path]
  if (!module) return
  if (module === 'access') {
    if (u.tier !== 'admin') return navigateTo('/')
    return
  }
  if (!can(u, module, 'view')) return navigateTo('/')
})
