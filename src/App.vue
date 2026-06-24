<script setup lang="ts"></script>

<template>
  <div class="flex h-screen flex-col">
    <!-- CORS banner slot (Option 4) -->
    <div id="cors-banner-slot"></div>

    <main class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
      <section class="border-border overflow-auto border-b lg:border-b-0 lg:border-r">
        <!-- RequestPanel (Option 2) -->
      </section>

      <section class="overflow-auto">
        <!-- ResponsePanel (Option 3) -->
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
