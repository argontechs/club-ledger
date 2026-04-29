import 'h3'
declare module 'h3' {
  interface H3EventContext {
    user?: {
      id: number
      email: string
      name: string
      roleId: number
      ambassadorId: number | null
      roleName: string
    }
  }
}
