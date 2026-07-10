<script setup lang="ts">
import { ref } from 'vue'
import MethodSelect from '@/components/request/MethodSelect.vue'
import UrlBar from '@/components/request/UrlBar.vue'
import type { HttpMethod } from '@/types/http'

const method = ref<HttpMethod>('GET')
const url = ref('')
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto p-8 space-y-4">
      <div class="flex items-center gap-2">
        <MethodSelect v-model="method" />
        <UrlBar v-model="url" @send="() => console.log('send triggered')" />
      </div>
      <p class="text-sm text-text-muted">url: {{ url }}</p>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
