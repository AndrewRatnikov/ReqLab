<script setup lang="ts">
import { ref } from 'vue'
import MethodSelect from '@/components/request/MethodSelect.vue'
import type { HttpMethod } from '@/types/http'

const method = ref<HttpMethod>('GET')
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto p-8 space-y-4">
      <p class="text-sm text-text-muted">Selected: {{ method }}</p>
      <MethodSelect v-model="method" />
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
