import { ref, computed } from 'vue'
import type { HttpMethod, HeaderEntry, ResponseResult, ClientError } from '@/types/http'

// Browsers surface both CORS blocks and genuine network failures as TypeError
// ("Failed to fetch") with no reliable way to distinguish them. We classify
// TypeError as `cors` since that is the dominant failure mode for a browser
// HTTP client; a real offline scenario will show the same message.
function classifyError(err: unknown): ClientError | null {
  // abort('timeout') rejects with the reason string directly, not a DOMException
  if (err === 'timeout') {
    return { kind: 'timeout', message: 'Request timed out after 30 seconds.' }
  }

  // abort() with no reason rejects with a DOMException named AbortError
  if (err instanceof DOMException && err.name === 'AbortError') {
    return null // manual cancel — not an error condition
  }

  if (err instanceof TypeError) {
    return { kind: 'cors', message: err.message }
  }

  return {
    kind: 'network',
    message: err instanceof Error ? err.message : 'An unexpected error occurred.',
  }
}

export function useFetchClient() {
  const method = ref<HttpMethod>('GET')
  const url = ref('')
  const headers = ref<HeaderEntry[]>([{ key: '', value: '' }])
  const body = ref('')

  const loading = ref(false)
  const response = ref<ResponseResult | null>(null)
  const error = ref<ClientError | null>(null)
  const latencyMs = ref<number | null>(null)

  const activeHeaders = computed(() => headers.value.filter((h) => h.key.trim() !== ''))

  let abortController: AbortController | null = null

  function cancel() {
    abortController?.abort()
  }

  function buildFetchOptions(
    requestHeaders: Record<string, string>,
    hasBody: boolean,
  ): RequestInit {
    return {
      method: method.value,
      headers: requestHeaders,
      ...(hasBody && body.value ? { body: body.value } : {}),
      signal: abortController!.signal,
    }
  }

  async function send() {
    abortController?.abort()
    abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController!.abort('timeout'), 30_000)

    loading.value = true
    response.value = null
    error.value = null
    latencyMs.value = null

    const requestHeaders: Record<string, string> = {}
    for (const { key, value } of activeHeaders.value) {
      requestHeaders[key.trim()] = value
    }

    const hasBody = method.value !== 'GET'
    const fetchOptions = buildFetchOptions(requestHeaders, hasBody)

    const start = performance.now()
    try {
      let res: Response
      try {
        res = await fetch(url.value, fetchOptions)
      } catch (err) {
        // Only a CORS-shaped failure warrants the proxy retry — timeouts and
        // manual cancels should propagate as-is (see classifyError above).
        if (classifyError(err)?.kind !== 'cors') {
          throw err
        }
        const proxyUrl = `${import.meta.env.VITE_PROXY_URL}?url=${encodeURIComponent(url.value)}`
        res = await fetch(proxyUrl, fetchOptions)
      }

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
      error.value = classifyError(err)
    } finally {
      clearTimeout(timeoutId)
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
    cancel,
  }
}
