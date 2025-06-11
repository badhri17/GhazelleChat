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
        />

        <!-- Loading Message -->
        <div v-if="isLoading && !streamingMessage" class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon name="lucide:bot" class="w-4 h-4 text-primary/70" />
          </div>
          <div class="max-w-[80%] rounded-lg p-3 bg-muted">
            <div class="text-xs text-muted-foreground mb-2 font-mono">
              {{ selectedModel }}
            </div>
            <div class="flex items-center gap-2 text-muted-foreground">
              <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>

        <!-- Streaming Message -->
        <ChatMessage
          v-if="streamingMessage"
          :message="streamingMessage"
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
const textareaRef = ref()

// Watch for conversation changes
watch(() => props.conversationId, async (newId) => {
  if (newId) {
    await loadMessages(newId)
  } else {
    messages.value = []
  }
}, { immediate: true })

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
      scrollToBottom()
    })
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
}

function addNewLine() {
  inputMessage.value += '\n'
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true

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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversationId: props.conversationId,
        model: selectedModel.value
      })
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
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: '',
                  model: selectedModel.value,
                  createdAt: new Date()
                }
                // Clear loading state on first content chunk
                isLoading.value = false
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
    console.error('Chat error:', error)
    streamingMessage.value = null
    // Could add error message to UI here
  } finally {
    isLoading.value = false
    
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

function scrollToBottom() {
  const scrollArea = document.querySelector('div[data-slot="scroll-area"]')
  if (scrollArea) {
    window.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: 'smooth'
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
  })
})

// Expose methods for parent component
defineExpose({
  sendMessage,
  addNewLine,
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
  textareaRef,
  selectedModel
})
</script> 