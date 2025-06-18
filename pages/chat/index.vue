<template>
  <!-- Sticky Header -->
  <ChatHeader 
    title="New Conversation"
    v-model:selected-model="selectedModel"
  />

  <!-- Content -->
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-hidden">
      <ChatInterface 
        ref="chatInterfaceRef"
        :conversation-id="null"
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

// Get user and conversations from layout
const user = inject<User>('user')!
const conversations = inject<Ref<Conversation[]>>('conversations')!
const refreshConversations = inject<() => Promise<void>>('refreshConversations')!

const chatInterfaceRef = ref()
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const selectedModel = ref('gpt-4o-mini')
const { getPendingMessage } = usePendingMessage()

onMounted(async () => {
  const pendingData = getPendingMessage()
  if (pendingData?.message?.trim() || pendingData?.attachments?.length) {
    await nextTick()
    setTimeout(() => {
      if (chatInterfaceRef.value) {
        console.log('🚀 Auto-sending pending message:', pendingData.message, 'with attachments:', pendingData.attachments?.length || 0)
        handleSendMessage(pendingData.message || '', pendingData.attachments || [])
      }
    }, 100)
  }
})

// Watch for loading state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isLoading, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = newVal
  }
}, { deep: true })

// Watch for streaming state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isStreaming, (newVal) => {
  if (newVal !== undefined) {
    isStreaming.value = newVal
  }
}, { deep: true })

// Watch for model changes and update ChatInterface
watch(selectedModel, (newModel) => {
  if (chatInterfaceRef.value) {
    chatInterfaceRef.value.selectedModel = newModel
  }
})

function handleConversationCreated(conversationId: string) {
  // Navigate to the new conversation
  navigateTo(`/chat/${conversationId}`)
}

function handleAddNewLine() {
  inputMessage.value += '\n'
}

function handleSendMessage(message: string, attachments: any[] = []) {
  console.log('📨 Page handleSendMessage called with:', message)
  if (chatInterfaceRef.value && (message.trim() || attachments.length)) {
    // Set the input message in the chat interface and trigger send
    chatInterfaceRef.value.sendMessage(message, attachments)
    inputMessage.value = ''
  }
}

function handleStopStreaming() {
  console.log('🚫 Page handleStopStreaming called')
  if (chatInterfaceRef.value) {
    chatInterfaceRef.value.stopStreaming()
  }
}


</script> 