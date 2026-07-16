<script setup lang="ts">
import { ref } from 'vue'
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import CorsAlertBanner from '@/components/cors/CorsAlertBanner.vue'
import CorsWorkaroundModal from '@/components/cors/CorsWorkaroundModal.vue'
import { useFetchClient } from '@/composables/useFetchClient'

const client = useFetchClient()
const corsModalVisible = ref(false)
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <CorsAlertBanner @info-click="corsModalVisible = true" />
    <CorsWorkaroundModal v-model:visible="corsModalVisible" />

    <main class="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto p-8 lg:grid-cols-2">
      <RequestPanel :client="client" />
      <ResponsePanel :client="client" />
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
