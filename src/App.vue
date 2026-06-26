<script setup lang="ts">
import DevHarness from '@/components/DevHarness.vue'
</script>

<template>
  <div class="bg-bg text-text-base flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="min-h-0 flex-1 overflow-auto">
      <!-- TODO Option 2/3: restore two-column grid, remove DevHarness -->
      <DevHarness />
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
