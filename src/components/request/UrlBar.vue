<script setup lang="ts">
import { ref, computed } from 'vue'
import { validateUrl } from '@/utils/validateUrl'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const touched = ref(false)

const validation = computed(() => validateUrl(props.modelValue))
const showError = computed(
  () => touched.value && props.modelValue.length > 0 && !validation.value.ok,
)

function onBlur() {
  if (props.modelValue.length > 0) touched.value = true
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    touched.value = true
    if (validation.value.ok) emit('send')
  }
}
</script>

<template>
  <div class="flex flex-col gap-1 flex-1">
    <input
      type="text"
      :value="modelValue"
      placeholder="https://api.example.com/endpoint"
      class="w-full rounded border bg-surface px-3 py-1.5 font-mono text-sm text-text-base placeholder:text-text-muted outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      :class="showError ? 'border-red-500 focus:ring-red-500' : 'border-border'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="onBlur"
      @keydown="onKeydown"
    />
    <span v-if="showError" class="text-xs text-red-500">
      {{ (validation as { ok: false; message: string }).message }}
    </span>
  </div>
</template>

<style lang="scss" scoped></style>
