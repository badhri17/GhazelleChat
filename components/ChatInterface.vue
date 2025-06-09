<template>
  <div class="flex flex-col h-full overflow-hidden relative">
    <!-- Model Selector -->
    <div class="border-b p-4">
      <Select v-model="selectedModel">
        <SelectTrigger class="w-48 bg-background/60 backdrop-blur-lg border border-border/40 hover:bg-background/80 focus:bg-background/80 transition-all duration-200 shadow-lg rounded-lg">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent class="bg-background/80 backdrop-blur-xl border border-border/40 shadow-xl">
          <SelectGroup>
            <SelectLabel>OpenAI</SelectLabel>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Anthropic</SelectLabel>
            <SelectItem value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Groq</SelectLabel>
            <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

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
}

const props = defineProps<Props>()
const emit = defineEmits<{
  conversationCreated: [conversationId: string]
  sendMessage: [message: string]
}>()

const selectedModel = ref('gpt-4o-mini')
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

  // Initialize streaming message
  streamingMessage.value = {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    model: selectedModel.value,
    createdAt: new Date()
  }

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
              streamingMessage.value!.content += data.content
            }
            
            if (data.conversationId && !props.conversationId) {
              emit('conversationCreated', data.conversationId)
            }
            
            if (data.done) {
              // Move streaming message to messages array
              messages.value.push({...streamingMessage.value!})
              streamingMessage.value = null
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
  // This will be handled by the scroll area
  const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
  if (scrollArea) {
    scrollArea.scrollTop = scrollArea.scrollHeight
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