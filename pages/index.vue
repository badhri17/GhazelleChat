<template>
  <div v-if="pending" class="min-h-screen flex items-center justify-center">
    <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
  
  <SidebarProvider v-else-if="user">
    <div class="flex min-h-screen w-full bg-background">
      <!-- Sidebar with conversations -->
      <ConversationSidebar 
        :conversations="conversations" 
        :user="user" 
      />

      <!-- Main Content -->
      <SidebarInset>
        <ChatHeader
          title="Welcome to GhazelleChat"
          v-model:selected-model="selectedModel"
        />

        <!-- Welcome Screen -->
        <WelcomeSearch
          title="Ask me anything"
          subtitle="I'm here to help with information, creative tasks, or problem-solving"
          v-model:message="queryMessage"
          :current-model="selectedModel"
          @send="handleQuickSend"
        />
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import ChatHeader from '@/components/ChatHeader.vue'
import { ref } from 'vue'
import WelcomeSearch from '@/components/WelcomeSearch.vue'

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

const { data: userData, pending: userPending } = await useFetch('/api/auth/me')

const { data: conversationsData, pending: conversationsPending, refresh: refreshConversationsData } = userData.value?.data?.user 
  ? await useFetch('/api/conversations') 
  : { data: ref(null), pending: ref(false), refresh: () => Promise.resolve() }

const pending = computed(() => userPending.value || conversationsPending.value)
const user = userData.value?.data?.user || null
const conversations = ref(conversationsData.value?.conversations?.map((conv: any) => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt)
})) || [])
const selectedModel = ref('gpt-4o-mini')
const queryMessage = ref('')

async function refreshConversations() {
  if (user) {
    const data = await $fetch('/api/conversations')
    if (data?.conversations) {
      conversations.value = data.conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt)
      }))
    }
  }
}


provide('refreshConversations', refreshConversations)

if (!pending.value && !user) {
  await navigateTo('/login')
}

async function startNewChat() {
  await navigateTo('/chat')
}

async function handleQuickSend(message: string, attachments: any[] = []) {
  if (!message.trim() && !attachments.length) return
  
  // Use the pending message composable to store message and attachments
  const { setPendingMessage } = usePendingMessage()
  setPendingMessage(message.trim(), attachments)
  
  // Navigate to chat page
  await navigateTo('/chat')
}
</script> 