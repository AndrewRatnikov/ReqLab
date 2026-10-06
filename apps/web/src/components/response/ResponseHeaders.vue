<script setup lang="ts">
import { computed } from 'vue'
import type { ResponseResult } from '@/types/http'
import { toDisplayHeaders, formatHeadersTitle, headersNote, NO_HEADERS_MESSAGE } from '@/utils/responseHeaders'

const props = defineProps<{
  response: ResponseResult
}>()

const rows = computed(() => toDisplayHeaders(props.response.headers, props.response.viaProxy))
const title = computed(() => formatHeadersTitle(rows.value.length))
const note = computed(() => headersNote(props.response.viaProxy))
</script>

<template>
  <details data-testid="response-headers" class="response-headers shrink-0 rounded border border-border bg-surface">
    <summary
      data-testid="response-headers-summary"
      class="cursor-pointer select-none px-3 py-2 text-sm text-text-muted"
    >
      {{ title }}
    </summary>
    <div class="border-t border-border px-3 py-2">
      <p data-testid="response-headers-note" class="mb-2 text-xs text-text-muted">{{ note }}</p>
      <p v-if="rows.length === 0" data-testid="response-headers-empty" class="text-sm text-text-muted">
        {{ NO_HEADERS_MESSAGE }}
      </p>
      <ul v-else class="max-h-64 overflow-auto font-mono text-sm">
        <li
          v-for="(row, index) in rows"
          :key="index"
          data-testid="response-headers-row"
          class="response-headers__row py-0.5"
        >
          <span class="font-bold text-text-base">{{ row.name }}</span
          ><span class="text-text-muted">: </span
          ><span class="text-text-base">{{ row.value }}</span>
        </li>
      </ul>
    </div>
  </details>
</template>

<style lang="scss" scoped>
.response-headers {
  &__row {
    overflow-wrap: anywhere;
  }
}
</style>
