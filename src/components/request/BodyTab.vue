<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HttpMethod } from '@/types/http'
import { validateJson } from '@/utils/validateJson'

const props = defineProps<{
  modelValue: string
  method: HttpMethod
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const disabled = computed(() => props.method === 'GET')
const touched = ref(false)

const validation = computed(() => validateJson(props.modelValue))
const showError = computed(
  () =>
    touched.value && !disabled.value && props.modelValue.trim().length > 0 && !validation.value.ok,
)

const textareaPt = computed(() => ({
  root: {
    class: [
      'w-full rounded border bg-surface px-3 py-2 font-mono text-sm text-text-base placeholder:text-text-muted outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
      showError.value ? 'border-red-500 focus:ring-red-500' : 'border-border',
    ],
  },
}))

function validate(): boolean {
  if (disabled.value) return true
  touched.value = true
  return props.modelValue.trim().length === 0 || validation.value.ok
}

defineExpose({ validate })
</script>

<template>
  <div class="flex flex-col gap-1">
    <PTextarea
      :model-value="modelValue"
      :disabled="disabled"
      :pt="textareaPt"
      rows="10"
      placeholder="Raw request body (JSON)"
      @update:model-value="emit('update:modelValue', $event as string)"
    />
    <span v-if="showError" class="text-xs text-red-500">
      {{ (validation as { ok: false; message: string }).message }}
    </span>
  </div>
</template>

<style lang="scss" scoped></style>
