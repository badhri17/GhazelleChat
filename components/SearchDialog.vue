<template>
  <CommandDialog v-model:open="open">
    <CommandInput placeholder="Search conversations..." v-model="searchQuery" />
    <CommandList>
      <CommandEmpty>
        <div class="text-center py-6">
          <Icon name="lucide:search" class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">No conversations found.</p>
        </div>
      </CommandEmpty>
      
      <CommandGroup heading="Recent Conversations" v-if="recentConversations.length > 0">
        <CommandItem
          v-for="conversation in recentConversations"
          :key="conversation.id"
          :value="conversation.title"
          @select="selectConversation(conversation.id)"
          class="flex items-center gap-3 p-3"
        >
          <Icon name="lucide:message-circle" class="w-4 h-4 text-muted-foreground" />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">
              {{ conversation.title }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDate(conversation.updatedAt) }}
            </div>
          </div>
          <CommandShortcut>{{ formatRelativeTime(conversation.updatedAt) }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="All Conversations" v-if="filteredConversations.length > 0">
        <CommandItem
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          :value="conversation.title"
          @select="selectConversation(conversation.id)"
          class="flex items-center gap-3 p-3"
        >
          <Icon name="lucide:message-circle" class="w-4 h-4 text-muted-foreground" />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">
              {{ conversation.title }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDate(conversation.updatedAt) }}
            </div>
          </div>
          <CommandShortcut>{{ formatRelativeTime(conversation.updatedAt) }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'

interface Conversation {
  id: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
}

interface Props {
  open: boolean
}

interface Emits {
  'update:open': [value: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const searchQuery = ref('')
const conversations = ref<Conversation[]>([])
const loading = ref(false)

// Fetch conversations when dialog opens
watchEffect(async () => {
  if (props.open && conversations.value.length === 0) {
    await fetchConversations()
  }
})

async function fetchConversations() {
  try {
    loading.value = true
    const data = await $fetch('/api/conversations')
    conversations.value = data?.conversations?.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    })) || []
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    conversations.value = []
  } finally {
    loading.value = false
  }
}

// Filter conversations based on search query
const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) {
    return conversations.value.slice(0, 10) // Show first 10 if no search
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return conversations.value
    .filter(conv => 
      conv.title.toLowerCase().includes(query)
    )
    .slice(0, 20) // Limit results
})

// Show recent conversations (last 5) when no search query
const recentConversations = computed(() => {
  if (searchQuery.value.trim()) {
    return []
  }
  
  return conversations.value
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
})

function selectConversation(conversationId: string) {
  open.value = false
  searchQuery.value = ''
  navigateTo(`/chat/${conversationId}`)
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

function formatRelativeTime(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return '1d'
  } else if (diffDays < 7) {
    return `${diffDays}d`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}w`
  } else {
    const months = Math.floor(diffDays / 30)
    return `${months}mo`
  }
}

// Clear search when dialog closes
watch(open, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = ''
  }
})

// Add keyboard shortcut (Ctrl/Cmd + K)
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      open.value = true
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>