<script setup lang="ts">
import { useFetchClient } from '@/composables/useFetchClient'

const { method, url, body, loading, response, error, latencyMs, send, cancel } = useFetchClient()

const presets = [
  {
    label: 'GET JSON (success)',
    method: 'GET' as const,
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    body: '',
  },
  {
    label: 'POST JSON (success)',
    method: 'POST' as const,
    url: 'https://jsonplaceholder.typicode.com/posts',
    body: '{"title":"test","body":"hello","userId":1}',
  },
  { label: 'CORS block', method: 'GET' as const, url: 'https://example.com', body: '' },
  {
    label: 'Bad host (network)',
    method: 'GET' as const,
    url: 'https://this-host-does-not-exist.invalid',
    body: '',
  },
  {
    label: 'Timeout (httpbin 10s delay)',
    method: 'GET' as const,
    url: 'https://httpbin.org/delay/35',
    body: '',
  },
]

function applyPreset(p: (typeof presets)[number]) {
  method.value = p.method
  url.value = p.url
  body.value = p.body
}
</script>

<template>
  <div class="space-y-4 p-6 font-mono text-sm">
    <h2 class="text-lg font-bold">Dev Harness — 1.7 (delete before Option 2)</h2>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in presets"
        :key="p.label"
        class="rounded border px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="applyPreset(p)"
      >
        {{ p.label }}
      </button>
    </div>

    <div class="flex gap-2">
      <select v-model="method" class="rounded border px-2 py-1">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
        <option>PATCH</option>
      </select>
      <input v-model="url" class="flex-1 rounded border px-2 py-1" placeholder="URL" />
    </div>

    <textarea
      v-model="body"
      class="w-full rounded border px-2 py-1"
      rows="3"
      placeholder="Body (POST/PUT/PATCH)"
    />

    <div class="flex gap-2">
      <button
        class="rounded bg-blue-600 px-4 py-1 text-white disabled:opacity-50"
        :disabled="loading"
        @click="send()"
      >
        {{ loading ? 'Sending…' : 'Send' }}
      </button>
      <button
        class="rounded bg-red-600 px-4 py-1 text-white disabled:opacity-50"
        :disabled="!loading"
        @click="cancel()"
      >
        Cancel
      </button>
    </div>

    <div class="rounded border p-3 space-y-1">
      <div><span class="font-bold">loading:</span> {{ loading }}</div>
      <div><span class="font-bold">latencyMs:</span> {{ latencyMs }}</div>
      <div><span class="font-bold">error:</span> {{ error ? JSON.stringify(error) : 'null' }}</div>
      <div v-if="response">
        <div>
          <span class="font-bold">status:</span> {{ response.status }} {{ response.statusText }}
        </div>
        <div><span class="font-bold">contentType:</span> {{ response.contentType }}</div>
        <pre class="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">{{
          response.body
        }}</pre>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
