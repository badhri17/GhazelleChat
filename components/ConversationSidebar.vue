<template>
  <Sidebar>
    <SidebarHeader>
              <div class="flex items-center gap-2 px-4 py-4 justify-center">
          <NuxtLink to="/" class="flex items-center hover:opacity-80 transition-opacity">
            <img src="@/assets/images/logo/logo1.png" alt="GhazelleChat" class="h-14 w-33 " />
          </NuxtLink>
        </div>
    </SidebarHeader>
    
    <SidebarContent>
      <SidebarGroup v-if="user">
        <!-- Prominent New Chat Button -->
        <div class="p-2 pb-2">
          <Button @click="() => navigateTo('/chat')" class="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs  " :size="'sm'">
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <SidebarGroupLabel class="px-4">Conversations</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <div v-if="conversations.length === 0" class="text-sm text-muted-foreground text-center py-8 px-4">
              No conversations yet.<br>
              <span class="text-primary">Click "New Chat" above to get started!</span>
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
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-xs font-medium text-primary">{{ user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U' }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate">{{ user.fullName || user.email }}</div>
            <div class="text-xs text-muted-foreground truncate">{{ user.email }}</div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Icon name="lucide:more-horizontal" class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="cursor-pointer">
              <Icon name="lucide:user" class="w-4 h-4 mr-2" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem class="cursor-pointer">
              <Icon name="lucide:credit-card" class="w-4 h-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem @click="openSettings" class="cursor-pointer">
              <Icon name="lucide:settings" class="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem class="cursor-pointer">
              <Icon name="lucide:bell" class="w-4 h-4 mr-2" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="cursor-pointer">
              <Icon name="lucide:crown" class="w-4 h-4 mr-2" />
              Upgrade to Pro
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="logout" class="cursor-pointer text-red-600 focus:text-red-600">
              <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarFooter>
  </Sidebar>

  <!-- Settings Dialog Component -->
  <SettingsDialog 
    v-model:open="settingsOpen" 
    :user="user" 
    @logout="logout"
  />
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


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

interface Props {
  conversations: Conversation[]
  user: User | null
  currentId?: string
}

defineProps<Props>()

const settingsOpen = ref(false)

function openSettings() {
  settingsOpen.value = true
}

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