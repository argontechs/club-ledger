<template>
  <div class="flex">
    <Sidebar />
    <main class="flex-1 min-h-screen flex flex-col">
      <Header />
      <div class="p-6 flex-1"><slot /></div>
    </main>
  </div>
</template>
