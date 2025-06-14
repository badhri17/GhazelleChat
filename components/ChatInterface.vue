<template>
  <div class="flex flex-col h-full overflow-hidden relative">


    <!-- Messages Area -->
    <ScrollArea class="flex-1 p-4 min-h-0">
      <div class="space-y-4 max-w-4xl mx-auto pb-24">
        <div v-if="messages.length === 0" class="text-center py-12">
          <Icon name="lucide:message-circle" class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
        />

        <!-- Loading Message -->
        <div  class="flex gap-3">
          <div v-if="isLoading && !streamingMessage" class="max-w-[80%]  p-3 backdrop-blur-xl border-none bg-background/20 rounded-lg mb-16">
            <div class="text-xs text-muted-foreground mb-2 font-mono">
              {{ selectedModel }}
            </div>
            <div class="flex items-center gap-2 text-foreground">
              <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>

        <!-- Streaming Message -->
        <ChatMessage
          v-if="streamingMessage"
          :message="streamingMessage"
          :conversation-id="props.conversationId || undefined"
          :is-streaming="true"
        />
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string
  email: string
  fullName: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  status?: string
  createdAt: Date
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
const streamingMessage = ref<Message | null>(null)
const isLoading = ref(false)
const isStreaming = ref(false)
const textareaRef = ref()

const pollingInterval = ref<NodeJS.Timeout | null>(null)

// Watch for conversation changes
watch(() => props.conversationId, async (newId) => {
  if (newId) {
    await loadMessages(newId)
    // Check for streaming messages and start polling
    startPollingForStreaming()
  } else {
    messages.value = []
    stopPolling()
  }
}, { immediate: true })

function startPollingForStreaming() {
  // Stop any existing polling
  stopPolling()
  
  // Check if we have any streaming messages
  const streamingMessages = messages.value.filter(msg => msg.status === 'streaming')
  
  if (streamingMessages.length > 0) {
    console.log('📡 Found streaming messages, starting to poll for updates')
    
    pollingInterval.value = setInterval(async () => {
      await pollStreamingMessages()
    }, 1000) // Poll every second
  }
}

function stopPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

async function pollStreamingMessages() {
  const streamingMessages = messages.value.filter(msg => msg.status === 'streaming')
  
  if (streamingMessages.length === 0) {
    stopPolling()
    return
  }
  
  for (const message of streamingMessages) {
    try {
      const response = await fetch(`/api/messages/${message.id}/content`)
      if (response.ok) {
        const data = await response.json()
        
        // Update message content if it changed
        if (data.content !== message.content) {
          const messageIndex = messages.value.findIndex(m => m.id === message.id)
          if (messageIndex !== -1) {
            messages.value[messageIndex] = {
              ...messages.value[messageIndex],
              content: data.content,
              status: data.status
            }
            
            // Scroll to bottom when content updates
            nextTick(() => {
              scrollToBottom()
            })
          }
        }
        
        // If message is complete, stop polling for it
        if (data.status === 'complete') {
          console.log('✅ Message completed:', message.id)
        }
      }
    } catch (error) {
      console.error('Error polling message:', message.id, error)
    }
  }
  
  // Check if all messages are complete
  const stillStreaming = messages.value.some(msg => msg.status === 'streaming')
  if (!stillStreaming) {
    stopPolling()
    console.log('🏁 All messages completed, stopping poll')
  }
}

// Clean up polling on unmount
onUnmounted(() => {
  stopPolling()
})

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
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
}

function addNewLine() {
  inputMessage.value += '\n'
}

function stopStreaming() {
  console.log('🛑 Stopping stream manually')

  // Clean up states
  isLoading.value = false
  isStreaming.value = false

  // If there's a partial streaming message, call the stop endpoint
  if (streamingMessage.value && streamingMessage.value.id) {
    const messageToStopId = streamingMessage.value.id
    console.log('🚀 Sending stop request for message ID:', messageToStopId)
    
    fetch(`/api/messages/${messageToStopId}/stop`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(res => {
      if (res.ok) console.log('✅ Stop request successful for', messageToStopId)
      else console.error('❌ Stop request failed for', messageToStopId)
    }).catch(err => console.error('Failed to send stop signal:', err))
    
    // If there's partial content, add the message to the list as incomplete
    if (streamingMessage.value.content.trim()) {
      console.log('💾 Preserving partial message:', streamingMessage.value.content.length + ' characters')
      messages.value.push({
        ...streamingMessage.value,
        status: 'incomplete'
      })
    }
  }

  streamingMessage.value = null
}

async function sendMessage() {
  if (inputMessage.value.trim() === '') return

  isLoading.value = true
  isStreaming.value = true

  const userMessage: Message = {
    id: Date.now().toString(), // Temporary ID
    role: 'user',
    content: inputMessage.value,
    createdAt: new Date()
  }
  messages.value.push(userMessage)
  
  const currentConversationId = props.conversationId
  
  const prompt = inputMessage.value
  inputMessage.value = '' // Clear input
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        conversationId: currentConversationId,
        model: selectedModel.value
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
        if (streamingMessage.value && streamingMessage.value.content) {
          messages.value.push({ ...streamingMessage.value, status: 'complete' })
        }
        break
      }
      
      const chunk = decoder.decode(value, { stream: true })
      // SSE sends data in `data: { ... }` format, often with multiple lines
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))

      for (const line of lines) {
        const jsonStr = line.replace('data: ', '')
        try {
          const data = JSON.parse(jsonStr)

          if (data.error) {
            throw new Error(data.error)
          }
          
          // First chunk of data, create the streaming message object
          if (streamingMessage.value === null && (data.messageId || data.content)) {
            isLoading.value = false // We're now streaming, not just thinking
            streamingMessage.value = {
              id: data.messageId || '',
              role: 'assistant',
              content: data.content || '',
              model: selectedModel.value,
              createdAt: new Date()
            }
          }

          if (streamingMessage.value) {
            // The very first chunk might only have the ID, content comes next
            if (data.messageId && streamingMessage.value.id === '') {
              streamingMessage.value.id = data.messageId
            }
            
            // If the first chunk had content, this will append subsequent content
            if (data.content && streamingMessage.value.content !== data.content) {
              streamingMessage.value.content += data.content
            }
            
            if (data.conversationId && !props.conversationId) {
              emit('conversationCreated', data.conversationId)
            }

            if (data.done) {
              isStreaming.value = false
            }
          }
        } catch (e) {
          console.error('Failed to parse stream chunk:', jsonStr, e)
        }
      }
      
      // Auto-scroll on new content
      nextTick(() => {
        scrollToBottom()
      })
    }
  } catch (error) {
    console.error('Chat error:', error)
    if (streamingMessage.value) {
      streamingMessage.value.content += `\n\n**Error:** ${error instanceof Error ? error.message : 'An unknown error occurred.'}`
      streamingMessage.value.status = 'incomplete'
      messages.value.push(streamingMessage.value)
    }
  } finally {
    isLoading.value = false
    isStreaming.value = false
    streamingMessage.value = null
  }
}

function scrollToBottom(behavior: 'smooth' | 'auto' = 'smooth') {
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
    const textarea = textareaRef.value?.$el || textareaRef.value
    if (textarea && textarea.focus) {
      textarea.focus()
    }
  });
  
})


// Expose methods for parent component
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
</script> 