<template>
  <SidebarProvider>
    <div class="flex min-h-screen w-full bg-background">
      <!-- Sidebar -->
      <Sidebar>
        <SidebarHeader>
          <div class="flex items-center gap-2 px-4 py-2">
            <h1 class="text-xl font-bold">GhazelleChat</h1>
            <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup v-if="user">
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupAction>
              <Button @click="startNewChat" size="sm" class="w-full" variant="outline">
                <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <div v-if="conversations.length === 0" class="text-sm text-muted-foreground text-center py-8 px-4">
                  No conversations yet.<br>
                  Start a new chat to get started!
                </div>
                
                <SidebarMenuItem v-for="conversation in conversations" :key="conversation.id">
                  <SidebarMenuButton 
                    @click="selectConversation(conversation.id)"
                    :data-active="currentConversationId === conversation.id"
                    class="w-full justify-start"
                  >
                    <Icon name="lucide:message-circle" class="w-4 h-4" />
                    <div class="flex flex-col items-start min-w-0 flex-1">
                      <span class="font-medium text-sm truncate w-full">
                        {{ conversation.title }}
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ formatDate(conversation.updatedAt) }}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter v-if="user" class="p-4 border-t">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">{{ user.email }}</div>
            <Button @click="logout" variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <!-- Main Content -->
      <SidebarInset>
        <!-- Header -->
        <header class="border-b px-4 py-3 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <SidebarTrigger v-if="user" />
            <div v-if="!user" class="flex items-center gap-2">
              <h1 class="text-xl font-bold">GhazelleChat</h1>
              <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
            </div>
            <h2 v-if="user" class="font-semibold">
              {{ currentConversationId ? 'Chat' : 'New Conversation' }}
            </h2>
          </div>
          <ThemeToggle />
        </header>

        <!-- Auth Screen -->
        <div v-if="!user" class="flex-1 flex items-center justify-center p-4">
          <AuthCard @login="handleAuth" />
        </div>

        <!-- Chat Interface -->
        <div v-else class="flex flex-col h-full">
          <!-- Chat Interface -->
          <div class="flex-1 overflow-hidden">
            <ChatInterface 
              ref="chatInterfaceRef"
              :conversation-id="currentConversationId"
              :user="user"
              @conversation-created="handleConversationCreated"
            />
          </div>
        </div>
      </SidebarInset>

      <!-- Fixed Input Area for Chat -->
      <div v-if="user" class="fixed bottom-0 right-0 z-50 p-4 transition-all duration-200 md:left-[var(--sidebar-width)] left-0">
        <form @submit.prevent="handleSendMessage" class="max-w-4xl mx-auto">
          <div class="flex gap-3">
            <Textarea
              ref="mainTextareaRef"
              v-model="inputMessage"
              placeholder="Type your message..."
              :disabled="isLoading"
              class="flex-1 min-h-[48px] max-h-[200px] resize-none bg-background/60 backdrop-blur-lg border border-border/40 focus:bg-background/80 focus:border-border/60 transition-all duration-200 shadow-lg rounded-lg"
              @keydown.enter.exact.prevent="handleSendMessage"
              @keydown.enter.shift.exact.prevent="handleAddNewLine"
            />
            <Button 
              type="submit" 
              :disabled="!inputMessage.trim() || isLoading"
              size="icon"
              class="self-end bg-primary/70 backdrop-blur-lg hover:bg-primary/90 border border-primary/30 shadow-lg transition-all duration-200 rounded-lg"
            >
              <Icon v-if="isLoading" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <Icon v-else name="lucide:send" class="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface User {
  id: string
  email: string
}

interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

const user = ref<User | null>(null)
const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string | null>(null)
const chatInterfaceRef = ref()
const mainTextareaRef = ref()
const inputMessage = ref('')
const isLoading = ref(false)

// Check auth status on mount
onMounted(async () => {
  await checkAuthStatus()
  if (user.value) {
    await loadConversations()
  }
})

async function checkAuthStatus() {
  try {
    const { data } = await $fetch('/api/auth/me')
    user.value = data.user
  } catch (error) {
    // User not logged in
  }
}

async function handleAuth(userData: User) {
  user.value = userData
  await loadConversations()
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    conversations.value = []
    currentConversationId.value = null
  } catch (error) {
    console.error('Logout error:', error)
  }
}

async function loadConversations() {
  try {
    const { conversations: data } = await $fetch('/api/conversations')
    conversations.value = data
  } catch (error) {
    console.error('Failed to load conversations:', error)
  }
}

function startNewChat() {
  currentConversationId.value = null
}

function selectConversation(conversationId: string) {
  currentConversationId.value = conversationId
}

function handleConversationCreated(conversationId: string) {
  currentConversationId.value = conversationId
  loadConversations() // Refresh the list
}

// Watch for loading state changes
watch(() => chatInterfaceRef.value?.isLoading, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = newVal
  }
}, { deep: true })

function handleAddNewLine() {
  inputMessage.value += '\n'
}

function handleSendMessage() {
  if (chatInterfaceRef.value && inputMessage.value.trim()) {
    // Set the input message in the chat interface and trigger send
    chatInterfaceRef.value.inputMessage = inputMessage.value
    chatInterfaceRef.value.sendMessage()
    inputMessage.value = ''
  }
}

function formatDate(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' })
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}
</script> 