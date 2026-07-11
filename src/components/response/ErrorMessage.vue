<script setup lang="ts">
import type { ClientError } from '@/types/http'

defineProps<{
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
</script>

<template>
  <div class="rounded border border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
    <template v-if="error.kind === 'network'"
      >Network Error: Unable to reach {{ extractHost(url) }}. Check the URL and your
      connection.</template
    >
    <template v-else-if="error.kind === 'cors'"
      >CORS Error: The target server did not allow this request from the browser. See the
      <a href="#cors-info-icon" class="underline hover:text-red-700">CORS workaround guide</a>
      above.</template
    >
    <template v-else-if="error.kind === 'timeout'">Request timed out after 30s.</template>
    <!-- invalid-url/invalid-json are field-level errors (UrlBar/BodyTab) and never
    reach useFetchClient's error ref, but the type is shared — fall back safely. -->
    <template v-else>{{ error.message }}</template>
  </div>
</template>

<style lang="scss" scoped></style>
