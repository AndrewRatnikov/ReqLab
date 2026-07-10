<script setup lang="ts">
defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  send: []
  cancel: []
}>()

const buttonPt = {
  root: {
    class:
      'inline-flex items-center gap-2 px-4 py-1.5 rounded font-mono text-sm font-bold cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
  },
}
</script>

<template>
  <PButton
    :pt="buttonPt"
    :class="
      loading
        ? 'border border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20'
        : 'bg-blue-500 text-white hover:bg-blue-600'
    "
    :aria-label="loading ? 'Cancel request' : 'Send request'"
    @click="loading ? emit('cancel') : emit('send')"
  >
    <span v-if="loading" class="pi pi-spin pi-spinner text-sm" aria-hidden="true" />
    {{ loading ? 'Cancel' : 'Send' }}
  </PButton>
</template>

<style lang="scss" scoped></style>
