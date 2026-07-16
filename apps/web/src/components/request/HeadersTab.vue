<script setup lang="ts">
import type { HeaderEntry } from '@/types/http'

const props = defineProps<{
  modelValue: HeaderEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: HeaderEntry[]]
}>()

const inputPt = {
  root: {
    class:
      'w-full rounded border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text-base placeholder:text-text-muted outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
  },
}

function updateRow(index: number, patch: Partial<HeaderEntry>) {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emit('update:modelValue', next)
}

function addRow() {
  emit('update:modelValue', [...props.modelValue, { key: '', value: '' }])
}

function removeRow(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-for="(row, index) in modelValue" :key="index" class="flex items-center gap-2">
      <PInputText
        :model-value="row.key"
        :pt="inputPt"
        placeholder="Header"
        class="flex-1"
        @update:model-value="updateRow(index, { key: $event as string })"
      />
      <PInputText
        :model-value="row.value"
        :pt="inputPt"
        placeholder="Value"
        class="flex-1"
        @update:model-value="updateRow(index, { value: $event as string })"
      />
      <button
        type="button"
        class="px-1 text-text-muted transition-colors hover:text-red-500"
        aria-label="Delete header row"
        @click="removeRow(index)"
      >
        <span class="pi pi-trash text-sm" aria-hidden="true" />
      </button>
    </div>
    <button
      type="button"
      class="self-start font-mono text-sm text-blue-500 transition-colors hover:text-blue-600"
      @click="addRow"
    >
      + Add Row
    </button>
  </div>
</template>

<style lang="scss" scoped></style>
