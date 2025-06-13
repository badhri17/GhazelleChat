<template>
  <div :class="cn('flex gap-3', message.role === 'user' ? 'justify-end' : '')">


    <!-- Message Content -->
    <div :class="cn(
      'max-w-[100%] rounded-lg p-3 relative group backdrop-blur-xl border-none bg-transparent',
      message.role === 'user' 
        ? 'bg-primary text-primary-foreground ml-12  backdrop-blur-4xl border-none' 
        : 'bg-background/20 border-none'
    )">
      <!-- Model Badge for Assistant -->
      <div 
        v-if="message.role === 'assistant' && message.model" 
        class="text-xs text-muted-foreground mb-2 font-mono"
      >
        {{ message.model }}
      </div>

      <!-- Message Text -->
      <div 
        class="markdown-content break-words"
        v-html="renderedContent"
      >
      </div>
      <span v-if="isStreaming" class="animate-pulse inline-block ml-1">|</span>

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
      
      <!-- Status indicator for streaming messages -->
      <div v-if="message.status === 'streaming' && !isStreaming" class="mt-2">
        <span class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <Icon name="lucide:wifi" class="w-3 h-3 animate-pulse" />
          Generating in background...
        </span>
      </div>
      
      <!-- Status indicator for incomplete messages -->
      <div v-if="message.status === 'incomplete' && !isStreaming" class="mt-2">
        <span class="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <Icon name="lucide:pause-circle" class="w-3 h-3" />
          Generation was stopped
        </span>
      </div>
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
  status?: string
  createdAt: Date
}

interface Props {
  message: Message
  isStreaming?: boolean
  conversationId?: string
}

const props = defineProps<Props>()

const { parseMarkdown } = useMarkdown()

// Computed property to render markdown content
const renderedContent = computed(() => {
  if (props.message.role === 'user') {
    // For user messages, just escape HTML and preserve line breaks
    return props.message.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  } else {
    // For assistant messages, parse markdown
    return parseMarkdown(props.message.content)
  }
})

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
      duration: 2000
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