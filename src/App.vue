<script setup lang="ts">
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import CorsAlertBanner from '@/components/cors/CorsAlertBanner.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const client = useFetchClient()

// TEMP: wired to console.log until 4.2's CorsWorkaroundModal exists.
function onInfoClick() {
  console.log('open CORS workaround modal')
}
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <CorsAlertBanner @info-click="onInfoClick" />

    <main class="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto p-8 lg:grid-cols-2">
      <RequestPanel :client="client" />
      <ResponsePanel :client="client" />
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
