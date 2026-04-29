<template>
  <div class="flex min-h-screen bg-[#F0F2F5]">
    <Sidebar class="hidden lg:flex" />
    <LayoutAppDrawer />
    <div class="flex-1 min-w-0 flex flex-col">
      <Header>
        <template #actions>
          <slot name="header-actions" />
        </template>
      </Header>
      <main class="flex-1 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
