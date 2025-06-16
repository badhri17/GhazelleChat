<template>
  <header class="sticky top-0 z-40 border-b px-4 py-3 flex justify-between items-center backdrop-blur-sm border-none">
    <div class="flex items-center gap-2">
      <SidebarTrigger />
      <h2 class="font-semibold mr-2 text-base">
        {{ title }}
      </h2>
      <ModelSelector :model-value="selectedModel" @update:model-value="emit('update:selectedModel', $event)" />
    </div>

    <div class="flex items-center gap-4">
      <!-- Search functionality -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              @click="openSearch"
              variant="ghost"
              size="sm"
              class="h-10 w-10 p-0"
            >
              <Icon name="lucide:search" class="w-5 h-5 text-xl" />
              <span class="sr-only">Search conversations</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Search conversations
              <kbd
                class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
              >⌘K</kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ThemeToggle />
    </div>
  </header>

  <!-- Search Dialog -->
  <SearchDialog v-model:open="searchOpen" />
</template>

<script setup lang="ts">
import { SidebarTrigger } from '@/components/ui/sidebar'
import ModelSelector from '@/components/ModelSelector.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Search
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import SearchDialog from '@/components/SearchDialog.vue'
import { ref } from 'vue'

interface Props {
  title: string
  selectedModel: string
}

defineProps<Props>()

const emit = defineEmits(['update:selectedModel'])

const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}
</script> 