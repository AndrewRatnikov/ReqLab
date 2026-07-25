<script setup lang="ts">
defineEmits<{
  'info-click': []
}>()
</script>

<template>
  <div
    class="flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-600"
  >
    <span
      >Browser Security Alert: CORS-blocked requests are automatically retried through a relay proxy
      — outbound traffic may pass through a third-party server when that happens.</span
    >
    <button
      id="cors-info-icon"
      type="button"
      class="inline-flex items-center justify-center rounded-full text-amber-600 transition-colors hover:text-amber-800"
      aria-label="CORS workaround info"
      @click="$emit('info-click')"
    >
      <span class="pi pi-info-circle text-base" aria-hidden="true" />
    </button>
  </div>
</template>

<style lang="scss" scoped></style>
