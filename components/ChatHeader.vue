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
      <ThemeToggle />
    </div>
  </header>
</template>

<script setup lang="ts">
import { SidebarTrigger } from '@/components/ui/sidebar'
import ModelSelector from '@/components/ModelSelector.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

interface Props {
  title: string
  selectedModel: string
}

defineProps<Props>()

const emit = defineEmits(['update:selectedModel'])
</script> 