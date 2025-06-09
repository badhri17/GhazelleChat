<template>
  <div class="space-y-2">
    <div v-if="conversations.length === 0" class="text-sm text-muted-foreground text-center py-8">
      No conversations yet.<br>
      Start a new chat to get started!
    </div>
    
    <button
      v-for="conversation in conversations"
      :key="conversation.id"
      @click="$emit('select', conversation.id)"
      :class="cn(
        'w-full text-left p-3 rounded-lg transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        currentConversationId === conversation.id ? 'bg-accent text-accent-foreground' : ''
      )"
    >
      <div class="font-medium text-sm truncate">
        {{ conversation.title }}
      </div>
      <div class="text-xs text-muted-foreground mt-1">
        {{ formatDate(conversation.updatedAt) }}
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { cn } from '~/lib/utils'

interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface Props {
  conversations: Conversation[]
  currentConversationId?: string | null
}

defineProps<Props>()
defineEmits<{
  select: [conversationId: string]
}>()

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