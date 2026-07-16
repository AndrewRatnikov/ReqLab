<script setup lang="ts">
import StatusBar from './StatusBar.vue'
import JsonViewer from './JsonViewer.vue'
import ErrorMessage from './ErrorMessage.vue'
import type { useFetchClient } from '@/composables/useFetchClient'

const props = defineProps<{
  client: ReturnType<typeof useFetchClient>
}>()

const { url, response, error, loading } = props.client
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <template v-if="loading">
      <p class="text-sm text-text-muted">Sending request…</p>
    </template>
    <template v-else-if="response">
      <StatusBar :response="response" />
      <JsonViewer :response="response" />
    </template>
    <template v-else-if="error">
      <ErrorMessage :error="error" :url="url" />
    </template>
    <template v-else>
      <p class="text-sm text-text-muted">Send a request to see the response here.</p>
    </template>
  </div>
</template>

<style lang="scss" scoped></style>
