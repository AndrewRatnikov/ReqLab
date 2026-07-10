<script setup lang="ts">
import { computed } from 'vue'
import type { ClientError } from '@/types/http'

const props = defineProps<{
  error: ClientError
  url: string
}>()

function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const copy = computed(() => {
  switch (props.error.kind) {
    case 'network':
      return `Network Error: Unable to reach ${extractHost(props.url)}. Check the URL and your connection.`
    case 'cors':
      return 'CORS Error: The target server did not allow this request from the browser. See the CORS workaround guide above.'
    case 'timeout':
      return 'Request timed out after 30s.'
    // invalid-url/invalid-json are field-level errors (UrlBar/BodyTab) and never
    // reach useFetchClient's error ref, but the type is shared — fall back safely.
    default:
      return props.error.message
  }
})
</script>

<template>
  <div class="rounded border border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
    {{ copy }}
  </div>
</template>

<style lang="scss" scoped></style>
