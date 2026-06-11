import { useAuthStore } from '~/stores/auth'

export async function downloadAuthed(path: string, fallbackName = 'download') {
  const auth = useAuthStore()
  // Club-scoped endpoints need the active-club header just like useAPI sends.
  const activeClubId = useState<number | null>('active-club-id', () => null)
  const res = await fetch(`/api/v1${path}`, {
    headers: {
      authorization: auth.token ? `Bearer ${auth.token}` : '',
      ...(activeClubId.value ? { 'x-club-id': String(activeClubId.value) } : {}),
    },
  })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') ?? ''
  const m = cd.match(/filename="?([^"]+)"?/)
  const name = m?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
