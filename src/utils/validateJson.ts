export function validateJson(value: string): { ok: true } | { ok: false; message: string } {
  try {
    JSON.parse(value)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Request body is not valid JSON' }
  }
}
