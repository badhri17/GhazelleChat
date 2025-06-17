<template>
  <div class="flex flex-col h-full overflow-hidden relative">


    <!-- Messages Area -->
    <ScrollArea class="flex-1 p-4 min-h-0">
      <div class="space-y-4 max-w-4xl mx-auto pb-24">
        <div v-if="messages.length === 0" class="text-center py-12">
          <Icon icon="lucide:message-circle" class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="text-lg font-medium mb-2">Start a conversation</h3>
          <p class="text-muted-foreground">
            Ask me anything and I'll help you with information, creative tasks, or problem-solving.
          </p>
        </div>

        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :conversation-id="props.conversationId || undefined"
          :is-streaming="message.status === 'streaming'"
          @image-loaded="scrollToBottom('smooth')"
        />

        <!-- Loading Message -->
        <div class="flex gap-3">
          <div v-if="isLoading" class="max-w-[80%] p-3 backdrop-blur-xl border-none bg-background/20 rounded-lg mb-16">
            <div class="text-xs text-muted-foreground mb-2 font-mono">
              {{ selectedModel }}
            </div>
            <div class="flex items-center gap-2 text-foreground">
              <Icon icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import ChatMessage from '~/components/ChatMessage.vue'
import { Icon } from '@iconify/vue'
import { useSettings } from '~/composables/useSettings'

interface User {
  id: string
  email: string
  fullName: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  model?: string
  status?: string
  attachments?: any[]
}

interface Props {
  conversationId?: string | null
  user: User
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'gpt-4o-mini'
})

const emit = defineEmits<{
  conversationCreated: [conversationId: string]
  'update:modelValue': [value: string]
}>()

const selectedModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const inputMessage = ref('')
const messages = ref<Message[]>([])
const isLoading = ref(false)
const isStreaming = ref(false)
const textareaRef = ref()

const pollingInterval = ref<NodeJS.Timeout | null>(null)

const { settings } = useSettings()

async function loadMessages(conversationId: string) {
  try {
    const { messages: data } = await $fetch(`/api/conversations/${conversationId}/messages`)
    messages.value = data.map((msg: any) => ({
      ...msg,
      createdAt: new Date(msg.createdAt)
    }))
    
    // Set the selected model to match the latest assistant message model
    const latestAssistantMessage = [...messages.value]
      .reverse()
      .find(msg => msg.role === 'assistant' && msg.model)
    
    if (latestAssistantMessage?.model) {
      selectedModel.value = latestAssistantMessage.model
    }
    
    nextTick(() => {
      scrollToBottom('auto')
    })
  } catch (error: any) {
    if (error?.status === 401) {
      console.warn('🔑 Session expired while loading messages. Redirecting to login.')
      navigateTo('/login')
    } else {
      console.error('Failed to load messages:', error)
    }
  }
}

function addNewLine() {
  inputMessage.value += '\n'
}

function stopStreaming() {
  console.log('🛑 Stopping stream manually')

  isLoading.value = false
  isStreaming.value = false

  // Find the message that is currently streaming and stop it.
  const streamingMsg = messages.value.find(m => m.status === 'streaming')
  if (streamingMsg && streamingMsg.id) {
    console.log('🚀 Sending stop request for message ID:', streamingMsg.id)
    
    fetch(`/api/messages/${streamingMsg.id}/stop`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(res => {
      if (res.ok) {
        console.log('✅ Stop request successful for', streamingMsg.id)
        // Update status locally for immediate feedback
        const msgIndex = messages.value.findIndex(m => m.id === streamingMsg.id)
        if (msgIndex !== -1) {
          messages.value[msgIndex].status = 'incomplete'
        }
      } else {
        console.error('❌ Stop request failed for', streamingMsg.id)
      }
    }).catch(err => console.error('Failed to send stop signal:', err))
  }
}

async function sendMessage(message: string, attachments: any[] = []) {
  if (message.trim() === '' && attachments.length === 0) return

  isLoading.value = true
  isStreaming.value = true
  let assistantMessageId = ''

  const userMessage: Message = {
    id: Date.now().toString(), // Temporary ID
    role: 'user',
    content: message,
    createdAt: new Date(),
    attachments,
  }
  messages.value.push(userMessage)
  
  nextTick(() => {
    scrollToBottom('smooth')
  })
  
  const currentConversationId = props.conversationId
  
  const prompt = message
  inputMessage.value = '' 
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        conversationId: currentConversationId,
        model: selectedModel.value,
        attachments,
        systemPrompt: settings.systemPrompt?.trim?.() || undefined,
      })
    })

    if (!response.body) {
      throw new Error('No response body')
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        isStreaming.value = false
        const idxMsg = messages.value.findIndex(m => m.id === assistantMessageId)
        if (idxMsg !== -1) messages.value[idxMsg].status = 'complete'
        break
      }
      
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))

      for (const line of lines) {
        const jsonStr = line.replace('data: ', '')
        try {
          const data = JSON.parse(jsonStr)

          if (data.error) {
            throw new Error(data.error)
          }

          if (data.messageId && !assistantMessageId) {
            assistantMessageId = data.messageId
            isLoading.value = false 
            
            messages.value.push({
              id: assistantMessageId,
              role: 'assistant',
              content: '',
              model: selectedModel.value,
              createdAt: new Date(),
              status: 'streaming'
            })
          } else if (data.content) {
            const msgIdx = messages.value.findIndex(m => m.id === assistantMessageId)
            if (msgIdx !== -1) {
              messages.value[msgIdx].content += data.content
              nextTick(scrollToBottom)
            }
          }
          
          if (data.conversationId && !props.conversationId) {
            emit('conversationCreated', data.conversationId)
          }

          if (data.done) {
            isStreaming.value = false
            const idxMsg = messages.value.findIndex(m => m.id === assistantMessageId)
            if (idxMsg !== -1) messages.value[idxMsg].status = 'complete'
          }
        } catch (e) {
          console.error('Failed to parse stream chunk:', jsonStr, e)
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error)
    const streamingMsg = messages.value.find(m => m.status === 'streaming')
    if (streamingMsg) {
      const msgIndex = messages.value.findIndex(m => m.id === streamingMsg.id)
      if (msgIndex !== -1) {
        messages.value[msgIndex].content += `\n\n**Error:** ${error instanceof Error ? error.message : 'An unknown error occurred.'}`
        messages.value[msgIndex].status = 'incomplete'
      }
    }
  } finally {
    isLoading.value = false
    if (!isStreaming.value && assistantMessageId) {
      const idxMsg = messages.value.findIndex(m => m.id === assistantMessageId)
      if (idxMsg !== -1) messages.value[idxMsg].status = 'complete'
    }
  }
}

function scrollToBottom(behavior: 'smooth' | 'auto' = 'auto') {
  const scrollArea = document.querySelector('div[data-slot="scroll-area"]')
  if (scrollArea) {
      window.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: behavior
    })
  }
}

// Auto-focus textarea on mount
onMounted(() => {
  nextTick(() => {
    scrollToBottom('auto')
    const textarea = textareaRef.value?.$el || textareaRef.value
    if (textarea && textarea.focus) {
      textarea.focus()
    }
  });
  
})

defineExpose({
  sendMessage,
  addNewLine,
  stopStreaming,
  focusInput: () => {
    nextTick(() => {
      const textarea = textareaRef.value?.$el || textareaRef.value
      if (textarea && textarea.focus) {
        textarea.focus()
      }
    })
  },
  inputMessage,
  isLoading,
  isStreaming,
  textareaRef,
  selectedModel
})

if (process.client) {
  const pollingInterval = ref<NodeJS.Timeout | null>(null)
  
  watch(
    () => props.conversationId,
    async (newId) => {
      if (newId) {
        await loadMessages(newId)
        startPollingForStreaming()
      } else {
        messages.value = []
        stopPolling()
      }
    },
    { immediate: true }
  )

  function startPollingForStreaming() {
    stopPolling()
    if (messages.value.some((m) => m.status === 'streaming')) {
      pollingInterval.value = setInterval(pollStreamingMessages, 1000)
    }
  }

  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }

  async function pollStreamingMessages() {
    const streaming = messages.value.filter((m) => m.status === 'streaming')
    if (streaming.length === 0) {
      stopPolling()
      return
    }

    for (const msg of streaming) {
      try {
        const data = await $fetch(`/api/messages/${msg.id}/content`)
        if (data.content !== msg.content) {
          const idx = messages.value.findIndex((m) => m.id === msg.id)
          if (idx !== -1) messages.value[idx] = { ...messages.value[idx], content: data.content, status: data.status as string }
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }

    if (!messages.value.some((m) => m.status === 'streaming')) {
      stopPolling()
    }
  }

  onUnmounted(stopPolling)
}
</script> 