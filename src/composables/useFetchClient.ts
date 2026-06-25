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
  }
}
