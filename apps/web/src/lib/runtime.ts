export function isMobileRuntime(): boolean {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const isTouchMac = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || isTouchMac
}