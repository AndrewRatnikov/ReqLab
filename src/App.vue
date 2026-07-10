<script setup lang="ts">
import { ref } from 'vue'
import MethodSelect from '@/components/request/MethodSelect.vue'
import UrlBar from '@/components/request/UrlBar.vue'
import SendButton from '@/components/request/SendButton.vue'
import HeadersTab from '@/components/request/HeadersTab.vue'
import BodyTab from '@/components/request/BodyTab.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const { method, url, headers, body, loading, response, error, latencyMs, send, cancel } =
  useFetchClient()

const bodyTabRef = ref<InstanceType<typeof BodyTab> | null>(null)

function trySend() {
  if (!bodyTabRef.value?.validate()) return
  send()
}
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto p-8 space-y-4">
      <div class="flex items-center gap-2">
        <MethodSelect v-model="method" />
        <UrlBar v-model="url" @send="trySend" />
        <SendButton :loading="loading" @send="trySend" @cancel="cancel" />
      </div>
      <HeadersTab v-model="headers" />
      <BodyTab ref="bodyTabRef" v-model="body" :method="method" />
      <p class="text-sm text-text-muted">url: {{ url }}</p>
      <p v-if="latencyMs !== null" class="text-sm text-text-muted">latency: {{ latencyMs }}ms</p>
      <pre v-if="response" class="text-xs">{{ response }}</pre>
      <p v-if="error" class="text-sm text-red-500">{{ error.kind }}: {{ error.message }}</p>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
