<script setup lang="ts">
import { computed } from 'vue'
import type { ResponseResult } from '@/types/http'

const props = defineProps<{
  response: ResponseResult
}>()

const isJson = computed(() => {
  const ct = props.response.contentType.toLowerCase()
  if (ct.includes('json')) return true
  // Content-Type doesn't declare JSON — fall back to attempting a parse,
  // since some APIs mislabel or omit the header.
  try {
    JSON.parse(props.response.body)
    return true
  } catch {
    return false
  }
})

const prettyBody = computed(() => {
  try {
    return JSON.stringify(JSON.parse(props.response.body), null, 2)
  } catch {
    return props.response.body
  }
})
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto rounded border border-border bg-surface">
    <pre
      v-if="isJson"
      class="whitespace-pre-wrap break-words p-3 font-mono text-sm text-text-base"
      >{{ prettyBody }}</pre
    >
    <p v-else class="p-3 text-sm text-text-muted">
      Response is not JSON. Non-JSON rendering is not supported in MVP.
    </p>
  </div>
</template>

<style lang="scss" scoped></style>
