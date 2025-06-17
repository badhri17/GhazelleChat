<template>
  <div :class="cn('flex gap-3', message.role === 'user' ? 'justify-end' : '')">


    <!-- Message Content -->
    <div :class="cn(
      'max-w-[100%] rounded-lg p-3 relative group backdrop-blur-xl border-none bg-transparent',
      message.role === 'user' 
        ? 'bg-white dark:bg-primary text-primary-foreground ml-12  backdrop-blur-4xl border-none' 
        : 'dark:bg-background/20 bg-background/40 border-none w-full',
      isStreaming && 'mb-10'
    )"
    
    >
      <!-- Model Badge for Assistant -->
      <div 
        v-if="message.role === 'assistant' && message.model" 
        class="text-xs text-muted-foreground mb-2 font-mono"
      >
        {{ message.model }}
      </div>
      <div v-if="imageAttachments.length || pdfAttachments.length" class="mb-2 flex flex-wrap gap-2">
        <a
          v-for="att in imageAttachments"
          :key="att.id"
          :href="att.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block"
        >
          <img
            :src="att.url"
            :alt="att.fileName"
            class="max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
            @load="onImageLoad"
            loading="lazy"
            decoding="async"
          />
        </a>
        <a
          v-for="att in pdfAttachments"
          :key="att.id"
          :href="att.url"
          target="_blank"
          rel="noopener noreferrer"
          class="w-40 h-48 rounded border flex flex-col items-center justify-center gap-2 bg-background/30 hover:bg-background/50 transition text-center text-xs p-2 cursor-pointer"
        >
          <Icon name="lucide:file-text" class="w-8 h-8 text-muted-foreground text-2xl" />
          <span class="truncate w-full">{{ att.fileName }}</span>
        </a>
      </div>

      <!-- Message Text -->
      <div
        class="prose dark:prose-invert max-w-none"
        :class="{ 'animate-pulse': isStreaming && !message.content }"
      >
        <!-- Show generated content once available -->
        <div v-if="message.content" v-html="renderedContent" />

        <!-- While streaming with no content yet, show spinner + text -->
        <div v-else-if="isStreaming" class="flex items-center gap-2 text-foreground">
          <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          <span>Thinking...</span>
        </div>

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
import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import { useDebounceFn } from '@vueuse/core'

const emit = defineEmits(['image-loaded'])

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  status?: string
  createdAt: Date
  attachments?: any[]
}

interface Props {
  message: Message
  isStreaming?: boolean
  conversationId?: string
}

const props = defineProps<Props>()

const { parseMarkdown } = useMarkdown()

function onImageLoad() {
  emit('image-loaded')
}

const imageAttachments = computed(() => {
  if (!props.message.attachments || props.message.role !== 'user') return []
  return props.message.attachments.filter(att => att.mimeType && att.mimeType.startsWith('image/'))
})

const pdfAttachments = computed(() => {
  if (!props.message.attachments || props.message.role !== 'user') return []
  return props.message.attachments.filter(att => att.mimeType === 'application/pdf')
})

const renderedContent = ref('')

function renderNow() {
  if (props.message.role === 'user') {
    renderedContent.value = props.message.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  } else {
    renderedContent.value = parseMarkdown(props.message.content)
  }
}
const throttledRender = useDebounceFn(renderNow, 16, { maxWait: 100 })
watch(
  () => props.message.content,
  () => {
    if (props.isStreaming) {
      throttledRender()
    } else {
      renderNow()
    }
  },
  { immediate: true }
)

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

<style scoped>
.blinker {
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style> 