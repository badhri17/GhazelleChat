<template>
  <SidebarProvider>
    <div class="flex min-h-screen w-full bg-background">
      <!-- Persistent Sidebar with conversations -->
      <ConversationSidebar 
        :conversations="conversations" 
        :user="user" 
        :current-id="currentConversationId"
      />

      <!-- Main Content Area -->
      <SidebarInset class="flex-1">
        <slot />
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

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

// Fetch user and conversations data (will be shared across all chat pages)
const { data: userData } = await useFetch('/api/auth/me')
const { data: conversationsData } = await useFetch('/api/conversations')

const user = userData.value?.data?.user!

const conversations = ref<Conversation[]>((conversationsData.value?.conversations || []).map((conv: any) => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt)
})).sort((a: Conversation, b: Conversation) => +new Date(b.updatedAt) - +new Date(a.updatedAt)))

// Get current conversation ID from route
const route = useRoute()
const currentConversationId = computed(() => {
  return route.params.id as string || undefined
})

// Refresh conversations function (to be called by child pages)
async function refreshConversations() {
  try {
    const { conversations: convs } = await $fetch('/api/conversations')
    conversations.value = (convs || []).map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt)
    })).sort((a: Conversation, b: Conversation) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  } catch (error: any) {
    if (process.client && error?.status === 401) {
      console.warn('🔑 Session expired while refreshing conversations. Redirecting to login.')
      navigateTo('/login')
    } else {
      console.error('Failed to fetch conversations:', error)
    }
  }
}

// Optionally refresh after mount for latest order/titles
if (process.client) {
  refreshConversations()
}

// Provide refresh function to child components
provide('refreshConversations', refreshConversations)
provide('conversations', conversations)
provide('user', user)
</script> 