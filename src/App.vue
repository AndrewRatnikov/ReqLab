<script setup lang="ts">
import MethodSelect from '@/components/request/MethodSelect.vue'
import UrlBar from '@/components/request/UrlBar.vue'
import SendButton from '@/components/request/SendButton.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const { method, url, loading, response, error, latencyMs, send, cancel } = useFetchClient()
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto p-8 space-y-4">
      <div class="flex items-center gap-2">
        <MethodSelect v-model="method" />
        <UrlBar v-model="url" @send="send" />
        <SendButton :loading="loading" @send="send" @cancel="cancel" />
      </div>
      <p class="text-sm text-text-muted">url: {{ url }}</p>
      <p v-if="latencyMs !== null" class="text-sm text-text-muted">latency: {{ latencyMs }}ms</p>
      <pre v-if="response" class="text-xs">{{ response }}</pre>
      <p v-if="error" class="text-sm text-red-500">{{ error.kind }}: {{ error.message }}</p>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
