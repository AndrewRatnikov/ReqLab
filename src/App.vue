<script setup lang="ts">
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const client = useFetchClient()
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto p-8 lg:grid-cols-2">
      <RequestPanel :client="client" />
      <ResponsePanel :client="client" />
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
