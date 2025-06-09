<template>
  <div class="h-screen flex flex-col bg-background">
    <header class="border-b px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold">GhazelleChat</h1>
        <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
      </div>
      
      <div class="flex items-center gap-2">
        <ThemeToggle />
        <Button v-if="user" @click="logout" variant="outline" size="sm">
          Logout
        </Button>
      </div>
    </header>

    <!-- Auth Screen -->
    <div v-if="!user" class="flex-1 flex items-center justify-center p-4">
      <AuthCard @login="handleAuth" />
    </div>

    <!-- Chat Interface -->
    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-80 border-r bg-muted/30 flex flex-col">
        <!-- New Chat Button -->
        <div class="p-4 border-b">
          <Button @click="startNewChat" class="w-full" variant="outline">
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto p-4">
          <ConversationsList 
            :conversations="conversations" 
            :current-conversation-id="currentConversationId"
            @select="selectConversation"
          />
        </div>
      </aside>

      <!-- Main Chat Area -->
      <main class="flex-1 flex flex-col">
        <ChatInterface 
          :conversation-id="currentConversationId"
          :user="user"
          @conversation-created="handleConversationCreated"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
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
</script> 