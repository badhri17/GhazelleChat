<template>
  <header class="sticky top-0 z-40 border-b px-4 py-3 flex justify-between items-center backdrop-blur-sm border-none">
    <div class="flex items-center gap-2">
      <SidebarTrigger v-if="hasSidebarContext" />
      <h2 class="font-semibold mr-2 text-base">
        {{ title }}
      </h2>
      <ModelSelector :model-value="selectedModel" @update:model-value="emit('update:selectedModel', $event)" />
    </div>

    <div class="flex items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger v-if="showNewChatButton" as-child>
            <Button
              @click="startNewChat"
              variant="ghost"
              size="sm"
              class="h-10 w-10 p-0"
            >
              <Icon name="lucide:plus" class="w-5 h-5 text-xl" />
              <span class="sr-only">New chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New chat
              <kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">{{ shortcutNewChat }}</kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
              >{{ shortcutSearch }}</kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ThemeToggle />
    </div>
  </header>
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
import { ref, computed } from 'vue'
import { useSidebar } from '@/components/ui/sidebar/utils'
import { useEventListener } from '@vueuse/core'

interface Props {
  title: string
  selectedModel: string
}

defineProps<Props>()

const emit = defineEmits(['update:selectedModel'])

const searchOpen = ref(false)

const hasSidebarContext = computed(() => {
  try {
    useSidebar()
    return true
  } catch {
    return false
  }
})

const showNewChatButton = computed(() => {
  try {
    const sidebar = useSidebar()
    return sidebar?.state.value === 'collapsed'
  } catch {
    // Fallback when sidebar context is not available
    return false
  }
})
const isMac = computed(() => process.client && /Mac|iPod|iPhone|iPad/.test(navigator.platform))
const shortcutNewChat = computed(() => isMac.value ? '⌘⇧O' : 'Ctrl+Shift+O')
const shortcutSearch = computed(() => isMac.value ? '⌘K' : 'Ctrl+K')

function openSearch() {
  searchOpen.value = true
}

function startNewChat() {
  navigateTo('/chat')
}


useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    startNewChat()
  }
})
</script> 