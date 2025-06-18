<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header class="border-b px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-2 px-4 py-4 justify-center">
        <NuxtLink to="/" class="flex items-center hover:opacity-80 transition-opacity">
          <img 
            :src="logoSrc" 
            alt="GhazelleChat" 
            class="h-14 w-33" 
          />
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
import darkLogo from '@/assets/images/logo/logo1.png';
import lightLogo from '@/assets/images/logo/logo2.png';
import { useColorMode, useCookie, useRoute } from '#imports';

const colorMode = useColorMode();
const themeCookie = useCookie<string>('nuxt_color_mode');
const currentTheme = computed(() => themeCookie.value || colorMode.preference || colorMode.value);

const logoSrc = computed(() => (currentTheme.value === 'dark' ? darkLogo : lightLogo));

definePageMeta({
  layout: false, 
  middleware: 'guest' 
})

interface User {
  id: string
  email: string
  fullName: string
}

async function handleLogin(userData: User) {
  // Redirect to main app after login
  await navigateTo('/')
}
</script> 