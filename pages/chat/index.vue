<template>
  <SidebarProvider>
    <div class="flex min-h-screen w-full bg-background">
      <!-- Sidebar with conversations -->
      <ConversationSidebar :conversations="conversations" :user="user" />

      <!-- Main Chat Area -->
      <SidebarInset>
        <!-- Sticky Header -->
        <header class="sticky top-0 z-40 border-b px-4 py-3 flex justify-between items-center bg-background/95 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <SidebarTrigger />
            <h2 class="font-semibold">New Conversation</h2>
          </div>
          <ThemeToggle />
        </header>

        <!-- Content -->
        <div class="flex flex-col h-full">
          <div class="flex-1 overflow-hidden">
            <ChatInterface 
              ref="chatInterfaceRef"
              :conversation-id="null"
              :user="user"
              @conversation-created="handleConversationCreated"
            />
          </div>
        </div>
      </SidebarInset>

      <!-- Fixed Glossy Input Area -->
      <div class="fixed bottom-0 right-0 z-50 p-4 transition-all duration-200 md:left-[var(--sidebar-width)] left-0">
        <div class="">
          <form @submit.prevent="handleSendMessage" class="max-w-4xl mx-auto p-4">
            <div class="flex gap-3">
              <Textarea
                ref="mainTextareaRef"
                v-model="inputMessage"
                placeholder="Type your message..."
                :disabled="isLoading"
                class="flex-1 min-h-[48px] max-h-[200px] resize-none bg-background/60 backdrop-blur-lg border border-border/40 focus:bg-background/80 focus:border-border/60 transition-all duration-200  rounded-lg"
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
const mainTextareaRef = ref()
const inputMessage = ref('')
const isLoading = ref(false)

// Watch for loading state changes from ChatInterface
watch(() => chatInterfaceRef.value?.isLoading, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = newVal
  }
}, { deep: true })

function handleConversationCreated(conversationId: string) {
  // Navigate to the new conversation
  navigateTo(`/chat/${conversationId}`)
}

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

// Auto-focus textarea on mount
onMounted(() => {
  nextTick(() => {
    const textarea = mainTextareaRef.value?.$el || mainTextareaRef.value
    if (textarea && textarea.focus) {
      textarea.focus()
    }
  })
})
</script> 