export function validateUrl(url: string): { ok: true } | { ok: false; message: string } {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { ok: false, message: 'URL must start with http:// or https://' }
  }
  return { ok: true }
}
