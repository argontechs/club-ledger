<template>
  <div class="relative flex min-h-dvh bg-[var(--color-surface)] text-[var(--color-ink)]">
    <!-- Ambient brand glow, fixed, anchored top-right of viewport -->
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div class="absolute -top-32 -right-24 w-[640px] h-[640px] rounded-full opacity-[0.18] blur-3xl"
        style="background: radial-gradient(closest-side, var(--color-brand) 0%, transparent 70%);" />
      <div class="absolute top-1/2 -left-40 w-[520px] h-[520px] rounded-full opacity-[0.10] blur-3xl"
        style="background: radial-gradient(closest-side, var(--color-ember) 0%, transparent 70%);" />
    </div>

    <Sidebar class="hidden lg:flex relative z-10" />
    <AppDrawer />
    <div class="relative z-10 flex-1 min-w-0 flex flex-col">
      <Header>
        <template #actions>
          <slot name="header-actions" />
        </template>
      </Header>
      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
    <AppConfirmModal />
    <AppToasts />
  </div>
</template>
