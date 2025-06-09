<template>
  <Sidebar>
    <SidebarHeader>
      <div class="flex items-center gap-2 px-4 py-2">
        <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <h1 class="text-xl font-bold">GhazelleChat</h1>
          <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Beta</span>
        </NuxtLink>
      </div>
    </SidebarHeader>
    
    <SidebarContent>
      <SidebarGroup v-if="user">
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        <SidebarGroupAction>
          <Button @click="() => navigateTo('/chat')" size="sm" class="w-full" variant="outline">
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            <div v-if="conversations.length === 0" class="text-sm text-muted-foreground text-center py-8 px-4">
              No conversations yet.<br>
              <NuxtLink to="/chat" class="text-primary hover:underline">Start a new chat!</NuxtLink>
            </div>
            
            <SidebarMenuItem v-for="conversation in conversations" :key="conversation.id">
              <SidebarMenuButton 
                @click="() => navigateTo(`/chat/${conversation.id}`)"
                :data-active="currentId === conversation.id"
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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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

interface Props {
  conversations: Conversation[]
  user: User | null
  currentId?: string
}

defineProps<Props>()

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/')
  } catch (error) {
    console.error('Logout error:', error)
    await navigateTo('/')
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