<template>
  <button
    @click="toggleTheme"
    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
    aria-label="Toggle theme"
  >
    <Icon
      icon="radix-icons:moon"
      class="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
    />
    <Icon
      icon="radix-icons:sun"
      class="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 top-2 left-2 "
    />
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue'
const colorMode = useColorMode()

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
};
</script> 