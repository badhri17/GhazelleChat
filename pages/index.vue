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
        <header class="border-b px-4 py-3 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <SidebarTrigger />
            <h2 class="font-semibold">Welcome to GhazelleChat</h2>
          </div>
          <ThemeToggle />
        </header>

        <!-- Welcome Screen -->
        <div class="flex-1 flex items-center justify-center p-4">
          <div class="text-center">
            <Icon name="lucide:message-circle" class="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 class="text-xl font-medium mb-2">Select a conversation</h3>
            <p class="text-muted-foreground mb-6">
              Choose an existing conversation from the sidebar or start a new one.
            </p>
            <Button @click="startNewChat" size="lg">
              <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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

// Use server-side data fetching to eliminate flash
const { data: userData, pending: userPending } = await useFetch('/api/auth/me')

// Only fetch conversations if user is authenticated
const { data: conversationsData, pending: conversationsPending } = userData.value?.data?.user 
  ? await useFetch('/api/conversations') 
  : { data: ref(null), pending: ref(false) }

const pending = computed(() => userPending.value || conversationsPending.value)
const user = userData.value?.data?.user || null
const conversations = ref(conversationsData.value?.conversations?.map((conv: any) => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt)
})) || [])

// Redirect to login if not authenticated
if (!pending.value && !user) {
  await navigateTo('/login')
}

async function startNewChat() {
  await navigateTo('/chat')
}
</script> 