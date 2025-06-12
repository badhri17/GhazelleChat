<template>
  <div :class="cn('flex gap-3', message.role === 'user' ? 'justify-end' : '')">


    <!-- Message Content -->
    <div :class="cn(
      'max-w-[80%] rounded-lg p-3 relative group backdrop-blur-xl border-none bg-transparent',
      message.role === 'user' 
        ? 'bg-primary text-primary-foreground ml-12  backdrop-blur-4xl border-none' 
        : 'bg-background/40 border-none'
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
        <Icon name="lucide:copy" class="w-3 h-3 cursor-pointer" />
      </Button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { cn } from '~/lib/utils'
import { toast } from 'vue-sonner'

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
    toast.success('Message copied to clipboard', {
      description: 'The message content has been copied to your clipboard.',
      duration: 3000
    })
  } catch (error) {
    console.error('Failed to copy message:', error)
    toast.error('Failed to copy message', {
      description: 'Please try again or copy manually.',
      duration: 2000
    })
  }
}
</script> 