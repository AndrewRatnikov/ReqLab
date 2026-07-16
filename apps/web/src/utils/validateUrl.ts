export function validateUrl(url: string): { ok: true } | { ok: false; message: string } {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { ok: false, message: 'Invalid URL. Must start with http:// or https://' }
  }
  return { ok: true }
}
