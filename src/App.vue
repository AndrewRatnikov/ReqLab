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
const activeTab = ref<'headers' | 'body'>('headers')

function trySend() {
  if (!bodyTabRef.value?.validate()) return
  send()
}

const tabListPt = {
  root: { class: 'flex gap-1 border-b border-border' },
}

const tabPt = {
  root: ({ context }: { context: { active: boolean } }) => ({
    class: [
      'cursor-pointer border-b-2 px-3 py-1.5 font-mono text-sm transition-colors',
      context.active
        ? 'border-blue-500 text-text-base'
        : 'border-transparent text-text-muted hover:text-text-base',
    ],
  }),
}

const tabPanelsPt = {
  root: { class: 'pt-3' },
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
      <PTabs :value="activeTab" @update:value="activeTab = $event as 'headers' | 'body'">
        <PTabList :pt="tabListPt">
          <PTab value="headers" :pt="tabPt">Headers</PTab>
          <PTab value="body" :pt="tabPt">Body</PTab>
        </PTabList>
        <PTabPanels :pt="tabPanelsPt">
          <PTabPanel value="headers">
            <HeadersTab v-model="headers" />
          </PTabPanel>
          <PTabPanel value="body">
            <BodyTab ref="bodyTabRef" v-model="body" :method="method" />
          </PTabPanel>
        </PTabPanels>
      </PTabs>
      <p class="text-sm text-text-muted">url: {{ url }}</p>
      <p v-if="latencyMs !== null" class="text-sm text-text-muted">latency: {{ latencyMs }}ms</p>
      <pre v-if="response" class="text-xs">{{ response }}</pre>
      <p v-if="error" class="text-sm text-red-500">{{ error.kind }}: {{ error.message }}</p>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
