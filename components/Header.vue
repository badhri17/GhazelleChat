<template>
  <header class="py-4 flex justify-between items-center">
    <div class="flex items-center gap-2">
      <!-- Search functionality -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              @click="openSearch"
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
            >
              <Icon name="lucide:search" class="w-4 h-4" />
              <span class="sr-only">Search conversations</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Search conversations <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘K</kbd></p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <div class="flex items-center gap-2">
      <ThemeToggle />
    </div>
  </header>

  <!-- Search Dialog -->
  <SearchDialog v-model:open="searchOpen" />
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}
</script>
