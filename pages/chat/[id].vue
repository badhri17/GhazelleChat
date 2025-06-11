<template>
  <SidebarProvider>
    <div class="flex min-h-screen w-full bg-background">
      <!-- Sidebar with conversations -->
      <ConversationSidebar 
        :conversations="conversations" 
        :user="user" 
        :current-id="conversationId"
      />

      <!-- Main Chat Area -->
      <SidebarInset>
        <!-- Sticky Header -->
        <header class="sticky top-0 z-40 border-b px-4 py-3 flex justify-between items-center bg-background/95 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <SidebarTrigger />
            <h2 class="font-semibold mr-2 text-base">
              {{ conversation?.title || 'Chat' }}
            </h2>
            <ModelSelector v-model="selectedModel" />
          </div>
          <div class="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <!-- Content -->
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
      </SidebarInset>

      <!-- Chat Input -->
      <ChatInput 
        v-model="inputMessage"
        :is-loading="isLoading"
        @send-message="handleSendMessage"
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

const route = useRoute()
const conversationId = route.params.id as string

// Fetch user and conversations
const { data: userData } = await useFetch('/api/auth/me')
const { data: conversationsData } = await useFetch('/api/conversations')

const user = userData.value?.data?.user!
const conversations = ref(conversationsData.value?.conversations?.map((conv: any) => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt)
})) || [])

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
const selectedModel = ref('gpt-4o-mini')


// Watch for loading state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isLoading, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = newVal
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

function handleSendMessage(message: string) {
  if (chatInterfaceRef.value && message.trim()) {
    // Set the input message in the chat interface and trigger send
    chatInterfaceRef.value.inputMessage = message
    chatInterfaceRef.value.sendMessage()
    inputMessage.value = ''
  }
}



// Set page title based on conversation
useHead({
  title: computed(() => `${conversation.value?.title || 'Chat'} | GhazelleChat`)
})
</script> 