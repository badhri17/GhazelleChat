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
const abortController = ref<AbortController | null>(null)

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

const pollingInterval = ref<NodeJS.Timeout | null>(null)

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
  
  // Abort the request first
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  
  // Clean up states
  isLoading.value = false
  isStreaming.value = false
  
  // If there's a partial streaming message, keep it and mark as incomplete
  if (streamingMessage.value && streamingMessage.value.content.trim()) {
    console.log('💾 Preserving partial message:', streamingMessage.value.content.length + ' characters')
    
    // Mark the message as incomplete in the database
    if (streamingMessage.value.id) {
      fetch(`/api/messages/${streamingMessage.value.id}/stop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Failed to stop message:', err))
    }
    
    // Add to messages with incomplete status
    messages.value.push({
      ...streamingMessage.value,
      status: 'incomplete'
    })
  }
  
  // Also stop any messages that might be streaming in background
  const backgroundStreamingMessages = messages.value.filter(msg => msg.status === 'streaming')
  for (const message of backgroundStreamingMessages) {
    fetch(`/api/messages/${message.id}/stop`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(() => {
      // Update local status immediately
      const index = messages.value.findIndex(m => m.id === message.id)
      if (index !== -1) {
        messages.value[index] = {
          ...messages.value[index],
          status: 'incomplete'
        }
      }
    }).catch(err => console.error('Failed to stop background message:', err))
  }
  
  streamingMessage.value = null
  
  // Focus textarea
  nextTick(() => {
    const textarea = textareaRef.value?.$el || textareaRef.value
    if (textarea && textarea.focus) {
      textarea.focus()
    }
  })
}

async function sendMessage() {
  // If currently streaming, stop it
  if (isStreaming.value) {
    stopStreaming()
    return
  }
  
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true
  isStreaming.value = false
  
  // Clean up any existing abort controller first
  if (abortController.value) {
    abortController.value = null
  }
  
  // Create new abort controller
  abortController.value = new AbortController()
  
  console.log('🚀 Starting new request with fresh AbortController')

  // Add user message to UI immediately
  const userMsg: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: userMessage,
    createdAt: new Date()
  }
  messages.value.push(userMsg)

  nextTick(() => {
    scrollToBottom()
  })

  try {
    console.log('🌐 Making fetch request, controller status:', {
      hasController: !!abortController.value,
      signalAborted: abortController.value?.signal.aborted
    })
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversationId: props.conversationId,
        model: selectedModel.value
      }),
      signal: abortController.value?.signal
    })

    if (!response.ok) throw new Error('Failed to send message')

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.content) {
              // Initialize streaming message on first content chunk
              if (!streamingMessage.value) {
                streamingMessage.value = {
                  id: data.messageId || (Date.now() + 1).toString(), // Use real messageId from server
                  role: 'assistant',
                  content: '',
                  model: selectedModel.value,
                  createdAt: new Date()
                }
                // Clear loading state and set streaming state on first content chunk
                isLoading.value = false
                isStreaming.value = true
              }
              
              // Update messageId if provided (for first chunk)
              if (data.messageId && streamingMessage.value.id !== data.messageId) {
                streamingMessage.value.id = data.messageId
              }
              
              streamingMessage.value.content += data.content
              
              // Scroll to bottom as content is being streamed
              nextTick(() => {
                scrollToBottom()
              })
            }
            
            if (data.conversationId && !props.conversationId) {
              emit('conversationCreated', data.conversationId)
            }
            
            if (data.done) {
              // Move streaming message to messages array
              messages.value.push({...streamingMessage.value!})
              streamingMessage.value = null
              isStreaming.value = false
              abortController.value = null
              
              // Final scroll to bottom when streaming is complete
              nextTick(() => {
                scrollToBottom()
              })
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    const errorName = (error as Error)?.name
    
    // Don't log or handle AbortError - it's intentional
    if (errorName === 'AbortError') {
      console.log('🛑 Request aborted by user')
      return // Exit early, don't process as error
    }
    
    console.error('Chat error:', error)
    // Could add error message to UI here for real errors
    
    // For real errors, preserve partial content if any
    if (streamingMessage.value && streamingMessage.value.content.trim()) {
      messages.value.push({...streamingMessage.value})
    }
    streamingMessage.value = null
  } finally {
    isLoading.value = false
    isStreaming.value = false
    abortController.value = null
    
    // Focus textarea and scroll to bottom
    nextTick(() => {
      const textarea = textareaRef.value?.$el || textareaRef.value
      if (textarea && textarea.focus) {
        textarea.focus()
      }
      scrollToBottom()
    })
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