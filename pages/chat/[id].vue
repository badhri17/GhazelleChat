<template>
  <ChatHeader 
    :title="conversation?.title || 'Chat'"
    v-model:selected-model="selectedModel"
  />

  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-hidden">
      <ChatInterface 
        ref="chatInterfaceRef"
        :conversation-id="conversationId"
        :user="user"
        v-model="selectedModel"
        @conversation-created="handleConversationCreated"
      />
    </div>
  </div>

  <!-- Chat Input -->
  <ChatInput 
    v-model="inputMessage"
    :current-model="selectedModel"
    :is-loading="isLoading"
    :is-streaming="isStreaming"
    @send-message="handleSendMessage"
    @stop-streaming="handleStopStreaming"
  />
</template>

<script setup lang="ts">
import ModelSelector from '@/components/ModelSelector.vue'
import ChatHeader from '@/components/ChatHeader.vue'

interface User {
  id: string
  email: string
  fullName: string
}

interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

definePageMeta({
  middleware: 'auth',
  layout: 'chat'
})

const route = useRoute()
const conversationId = route.params.id as string

// Get user and conversations from layout
const user = inject<User>('user')!
const conversations = inject<Ref<Conversation[]>>('conversations')!
const refreshConversations = inject<() => Promise<void>>('refreshConversations')!

// Find current conversation or create a placeholder
const conversation = computed(() => {
  const found = conversations.value.find(c => c.id === conversationId)
  if (found) return found
  
  // Return a placeholder conversation if not found in list
  // This handles cases where conversation exists but not yet in the list
  return {
    id: conversationId,
    title: 'Chat',
    createdAt: new Date(),
    updatedAt: new Date()
  }
})

const chatInterfaceRef = ref()
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const selectedModel = ref('gpt-4o-mini')


// Watch for loading state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isLoading, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = newVal
  }
}, { deep: true })

// Watch for streaming state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isStreaming, (newVal, oldVal) => {
  if (newVal !== undefined) {
    isStreaming.value = newVal
  }

  // When streaming finishes (oldVal true -> newVal false), refresh conversations list
  if (oldVal && !newVal) {
    refreshConversations()
  }
}, { deep: true })

function handleConversationCreated(newConversationId: string) {
  if (newConversationId !== conversationId) {
    navigateTo(`/chat/${newConversationId}`)
  }
}

function handleAddNewLine() {
  inputMessage.value += '\n'
}

function handleSendMessage(message: string, attachments: any[] = []) {
  console.log('📨 Page handleSendMessage called with:', message, attachments)
  if (chatInterfaceRef.value && (message.trim() || attachments.length)) {
    chatInterfaceRef.value.sendMessage(message, attachments)
    inputMessage.value = ''

    const idx = conversations.value.findIndex(c => c.id === conversationId)
    if (idx !== -1) {
      conversations.value[idx].updatedAt = new Date()
    } else {
      // If conversation not in list yet (e.g., first reply), add placeholder
      conversations.value.push({
        id: conversationId,
        title: conversation.value.title ?? 'Chat',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
    }
    // Re-sort
    conversations.value.sort((a: Conversation, b: Conversation) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  }
}

function handleStopStreaming() {
  console.log('🚫 Page handleStopStreaming called')
  if (chatInterfaceRef.value) {
    chatInterfaceRef.value.stopStreaming()
  }
}



// Set page title based on conversation
useHead({
  title: computed(() => `${conversation.value?.title || 'Chat'} | GhazelleChat`)
})
</script> 