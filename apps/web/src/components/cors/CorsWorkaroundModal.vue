<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const dialogPt = {
  mask: { class: 'flex items-center justify-center bg-black/50 p-4' },
  root: {
    class: 'w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl',
  },
  header: {
    class: 'flex items-center justify-between gap-4 border-b border-border px-4 py-3',
  },
  title: { class: 'font-mono text-sm font-bold text-text-base' },
  content: { class: 'space-y-3 px-4 py-4 text-sm text-text-base' },
  pcCloseButton: {
    root: { class: 'rounded p-1 text-text-muted transition-colors hover:text-text-base' },
  },
}
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    dismissable-mask
    header="CORS Workaround: Launch Chrome with Web Security Disabled"
    :pt="dialogPt"
    @update:visible="emit('update:visible', $event as boolean)"
  >
    <p class="font-bold text-red-500">
      Warning: this disables a core browser security protection. Only use a dedicated profile for
      local testing — never browse the general web with it.
    </p>
    <ol class="list-decimal space-y-2 pl-5">
      <li>Quit every open Chrome window completely.</li>
      <li>
        Open a terminal and launch Chrome with a separate profile and CORS checks disabled:
        <!-- prettier-ignore -->
        <pre class="mt-1 overflow-x-auto rounded border border-border bg-bg p-2 font-mono text-xs">open -na "Google Chrome" --args --user-data-dir="/tmp/reqlab-dev-profile" --disable-web-security</pre>
        <span class="text-xs text-text-muted"
          >(Windows:
          <code>chrome.exe --user-data-dir="C:\reqlab-dev-profile" --disable-web-security</code
          >)</span
        >
      </li>
      <li>A new Chrome window opens using the isolated profile — CORS is disabled only there.</li>
      <li>Open ReqLab in that window and retry the request.</li>
      <li>Close that profile's Chrome window when you're done testing.</li>
    </ol>
  </PDialog>
</template>

<style lang="scss" scoped></style>
