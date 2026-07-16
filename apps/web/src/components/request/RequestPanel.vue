<script setup lang="ts">
import { ref } from 'vue'
import MethodSelect from './MethodSelect.vue'
import UrlBar from './UrlBar.vue'
import SendButton from './SendButton.vue'
import HeadersTab from './HeadersTab.vue'
import BodyTab from './BodyTab.vue'
import type { useFetchClient } from '@/composables/useFetchClient'

const props = defineProps<{
  client: ReturnType<typeof useFetchClient>
}>()

const { method, url, headers, body, loading, send, cancel } = props.client

const bodyTabRef = ref<InstanceType<typeof BodyTab> | null>(null)
const activeTab = ref<'headers' | 'body'>('headers')

function trySend() {
  if (!bodyTabRef.value?.validate()) return
  send()
}

// Scoped to this panel via template @keydown bubbling — fires for Cmd/Ctrl+Enter
// from any focused field inside (method, url, headers, body), not just the URL bar.
function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    trySend()
  }
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
  <div class="flex flex-col gap-4" @keydown="onKeydown">
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
  </div>
</template>

<style lang="scss" scoped></style>
