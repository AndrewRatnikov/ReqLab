<script setup lang="ts">
import type { HttpMethod } from '@/types/http'

defineProps<{
  modelValue: HttpMethod
}>()

const emit = defineEmits<{
  'update:modelValue': [value: HttpMethod]
}>()

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: 'text-green-500',
  POST: 'text-blue-500',
  PUT: 'text-amber-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
}

const selectPt = {
  root: {
    class:
      'inline-flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-surface cursor-pointer hover:border-text-muted transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1',
  },
  label: { class: 'font-mono font-bold text-sm leading-none' },
  dropdown: { class: 'flex items-center text-text-muted' },
  overlay: {
    class:
      'mt-1 rounded border border-border bg-surface shadow-lg py-1 min-w-[7rem] z-50',
  },
  listContainer: { class: '' },
  list: { class: 'p-0 m-0 list-none' },
  option: ({ context }: { context: { focused: boolean; selected: boolean } }) => ({
    class: [
      'px-3 py-2 cursor-pointer select-none transition-colors',
      context.focused || context.selected ? 'bg-border' : '',
    ],
  }),
}
</script>

<template>
  <PSelect
    :model-value="modelValue"
    :options="HTTP_METHODS"
    :pt="selectPt"
    @update:model-value="emit('update:modelValue', $event as HttpMethod)"
  >
    <template #value="{ value }">
      <span :class="['font-mono font-bold text-sm', METHOD_COLOR[value as HttpMethod]]">
        {{ value }}
      </span>
    </template>
    <template #option="{ option }">
      <span :class="['font-mono font-bold text-sm', METHOD_COLOR[option as HttpMethod]]">
        {{ option }}
      </span>
    </template>
    <template #dropdownicon>
      <span class="pi pi-angle-down text-xs" />
    </template>
  </PSelect>
</template>

<style lang="scss" scoped></style>
