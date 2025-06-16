<template>
  <SidebarProvider>
    <div class="flex min-h-screen w-full bg-background">
      <!-- Sidebar with conversations -->
      <ConversationSidebar :conversations="conversations" :user="user" />

      <!-- Main Chat Area -->
      <SidebarInset>
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
      </SidebarInset>

      <!-- Chat Input -->
      <ChatInput 
        v-model="inputMessage"
        :current-model="selectedModel"
        :is-loading="isLoading"
        :is-streaming="isStreaming"
        @send-message="handleSendMessage"
        @stop-streaming="handleStopStreaming"
      />
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
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
  middleware: 'auth'
})

// Fetch user and conversations data
const { data: userData } = await useFetch('/api/auth/me')
const { data: conversationsData } = await useFetch('/api/conversations')

const user = userData.value?.data?.user!
const conversations = ref(conversationsData.value?.conversations?.map((conv: any) => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt)
})) || [])

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