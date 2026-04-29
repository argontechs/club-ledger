<script setup lang="ts">
const state = useConfirmState()

function respond(v: boolean) {
  state.value.resolve?.(v)
  state.value.open = false
  state.value.resolve = null
}
</script>

<template>
  <AppModal :open="state.open" :title="state.title" @close="respond(false)">
    <p class="text-[13px] text-gray-600 whitespace-pre-line">{{ state.message }}</p>
    <template #footer>
      <AppButton variant="secondary" @click="respond(false)">{{ state.cancelText }}</AppButton>
      <AppButton :variant="state.tone === 'danger' ? 'danger' : 'primary'" @click="respond(true)">
        {{ state.confirmText }}
      </AppButton>
    </template>
  </AppModal>
</template>
