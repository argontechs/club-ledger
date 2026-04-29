<template>
  <div class="flex min-h-screen bg-[#F0F2F5]">
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <Header>
        <template #actions>
          <slot name="header-actions" />
        </template>
      </Header>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
