export function useConfirm() {
  return (msg: string) => Promise.resolve(window.confirm(msg))
}
