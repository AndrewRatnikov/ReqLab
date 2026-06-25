import { ref, computed } from 'vue'
import type { HttpMethod, HeaderEntry, ResponseResult, ClientError } from '@/types/http'

export function useFetchClient() {
  const method = ref<HttpMethod>('GET')
  const url = ref('')
  const headers = ref<HeaderEntry[]>([{ key: '', value: '' }])
  const body = ref('')

  const loading = ref(false)
  const response = ref<ResponseResult | null>(null)
  const error = ref<ClientError | null>(null)
  const latencyMs = ref<number | null>(null)

  const activeHeaders = computed(() =>
    headers.value.filter((h) => h.key.trim() !== ''),
  )

  async function send() {
    loading.value = true
    response.value = null
    error.value = null
    latencyMs.value = null

    const requestHeaders: Record<string, string> = {}
    for (const { key, value } of activeHeaders.value) {
      requestHeaders[key.trim()] = value
    }

    const hasBody = method.value !== 'GET'

    const start = performance.now()
    try {
      const res = await fetch(url.value, {
        method: method.value,
        headers: requestHeaders,
        ...(hasBody && body.value ? { body: body.value } : {}),
      })

      const elapsed = performance.now() - start
      const contentType = res.headers.get('content-type') ?? ''
      const text = await res.text()

      response.value = {
        status: res.status,
        statusText: res.statusText,
        body: text,
        contentType,
        latencyMs: Math.round(elapsed),
      }
      latencyMs.value = response.value.latencyMs
    } catch (err) {
      latencyMs.value = Math.round(performance.now() - start)
      // error classification handled in 1.6 — rethrow for now
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    method,
    url,
    headers,
    body,
    loading,
    response,
    error,
    latencyMs,
    activeHeaders,
    send,
  }
}
