<script setup lang="ts">
import { computed } from 'vue'
import type { ResponseResult } from '@/types/http'

const props = defineProps<{
  response: ResponseResult | null
}>()

const statusColor = computed(() => {
  const status = props.response?.status ?? 0
  if (status >= 200 && status < 300) return 'text-green-500'
  if (status >= 400) return 'text-red-500'
  return 'text-text-muted'
})
</script>

<template>
  <div v-if="response" class="flex items-center gap-3 font-mono text-sm">
    <span :class="statusColor" class="font-bold">
      {{ response.status }}<span v-if="response.statusText"> {{ response.statusText }}</span>
    </span>
    <span class="text-text-muted">{{ response.latencyMs }}ms</span>
  </div>
</template>

<style lang="scss" scoped></style>
