<template>
  <div class="min-h-screen bg-fixed bg-cover bg-center bg-no-repeat" :style="{ backgroundImage: `url(/images/bg1-dark.webp)` }">
    <div class="min-h-screen bg-transparent">
      <NuxtPage />
      <Toaster />
    </div>
  </div>
</template>

<script setup>
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css' // vue-sonner v2 requires this import

// Import the background image
</script>

<style>
body {
  margin: 0;
  padding: 0;
}
.bg-background,.bg-sidebar{
    background-color: transparent !important;
}
</style>