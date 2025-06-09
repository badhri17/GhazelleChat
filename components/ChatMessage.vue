<template>
  <div :class="cn('flex gap-3', message.role === 'user' ? 'justify-end' : '')">
    <!-- Avatar -->
    <div 
      v-if="message.role === 'assistant'"
      class="rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
    >
      
    </div>

    <!-- Message Content -->
    <div :class="cn(
      'max-w-[80%] rounded-lg p-3 relative group',
      message.role === 'user' 
        ? 'bg-primary text-primary-foreground ml-12' 
        : 'bg-muted'
    )">
      <!-- Model Badge for Assistant -->
      <div 
        v-if="message.role === 'assistant' && message.model" 
        class="text-xs text-muted-foreground mb-2 font-mono"
      >
        {{ message.model }}
      </div>

      <!-- Message Text -->
      <div class="whitespace-pre-wrap break-words">
        {{ message.content }}
        <span v-if="isStreaming" class="animate-pulse">|</span>
      </div>

      <!-- Timestamp -->
      <div :class="cn(
        'text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity',
        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
      )">
        {{ formatTime(message.createdAt) }}
      </div>

      <!-- Copy Button -->
      <Button
        v-if="!isStreaming"
        @click="copyMessage"
        variant="ghost"
        size="icon"
        class="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icon name="lucide:copy" class="w-3 h-3" />
      </Button>
    </div>

    <!-- User Avatar -->
    <div 
      v-if="message.role === 'user'"
      class="rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
    >
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '~/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  createdAt: Date
}

interface Props {
  message: Message
  isStreaming?: boolean
}

const props = defineProps<Props>()

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    // Could add toast notification here
  } catch (error) {
    console.error('Failed to copy message:', error)
  }
}
</script> 