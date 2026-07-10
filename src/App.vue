<script setup lang="ts">
import RequestPanel from '@/components/request/RequestPanel.vue'
import StatusBar from '@/components/response/StatusBar.vue'
import JsonViewer from '@/components/response/JsonViewer.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const client = useFetchClient()
const { url, response, error } = client
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto p-8 space-y-4">
      <RequestPanel :client="client" />
      <!-- Temporary manual-verification output; replaced by ResponsePanel (Option 3) -->
      <p class="text-sm text-text-muted">url: {{ url }}</p>
      <StatusBar :response="response" />
      <JsonViewer v-if="response" :response="response" />
      <p v-if="error" class="text-sm text-red-500">{{ error.kind }}: {{ error.message }}</p>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
