import { useAuthStore } from '~/stores/auth'
import { can as evaluate, type PermissionModule } from '~~/shared/permissions'

/** Frontend mirror of the server guards — same shared evaluation. */
export function usePermissions() {
  const auth = useAuthStore()
  function can(module: PermissionModule, level: 'view' | 'edit' = 'view'): boolean {
    const u = auth.user as any
    if (!u) return false
    return evaluate(u, module, level)
  }
  return { can }
}
