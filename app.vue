<template>
  <div>
    <img :src="getCurrentBackgroundPath" class="fixed inset-0 w-full h-full object-cover -z-10" />
    <div class="min-h-screen bg-transparent">
      <NuxtPage />
      <Toaster />
    </div>
  </div>
</template>

<script setup>
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css' // vue-sonner v2 requires this import

const { getCurrentBackgroundPath } = useBackground();
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