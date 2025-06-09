<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header class="border-b px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <h1 class="text-xl font-bold">GhazelleChat</h1>
          <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
        </NuxtLink>
      </div>
      <ThemeToggle />
    </header>
    
    <div class="flex-1 flex items-center justify-center p-4">
      <AuthCard @login="handleLogin" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false, // Disable default layout
  middleware: 'guest' // Only allow non-authenticated users
})

interface User {
  id: string
  email: string
}

async function handleLogin(userData: User) {
  // Redirect to main app after login
  await navigateTo('/')
}
</script> 