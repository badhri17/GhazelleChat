<template>
  <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container flex h-14 items-center">
      <div class="mr-4 hidden md:flex">
        <NuxtLink to="/" class="mr-6 flex items-center space-x-2">
          <span class="hidden font-bold sm:inline-block">GhazelleUI</span>
        </NuxtLink>
      </div>
      <div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
        <div class="w-full flex-1 md:w-auto md:flex-none">
          <Button
            variant="ghost"
            class="md:w-40 w-full justify-start text-sm font-normal text-muted-foreground"
            @click="openSearch"
          >
            <Search class="mr-2 h-4 w-4" />
            Search...
          </Button>
        </div>
        <nav class="flex items-center">
          <ThemeToggle />
        </nav>
      </div>
    </div>
  </header>
  <SearchDialog v-model:open="searchOpen" />
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
import SearchDialog from './SearchDialog.vue'
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'

const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}
</script>
