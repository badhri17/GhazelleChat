<template>
  <Sidebar>
    <SidebarHeader>
              <div class="flex items-center gap-2 px-4 py-4 justify-center">
          <NuxtLink to="/" class="flex items-center hover:opacity-80 transition-opacity">
            <img 
              :src="logoSrc" 
              alt="GhazelleChat" 
              class="h-14 w-33" 
            />
          </NuxtLink>
        </div>
    </SidebarHeader>
    
    <SidebarContent>
      <SidebarGroup v-if="user">
        <div class="p-2 pb-2">
          <Button @click="() => navigateTo('/chat')" class="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs  " :size="'sm'">
            <Plus class="w-4 h-4 mr-2" />
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
            
            <SidebarMenuItem v-for="conversation in sortedConversations" :key="conversation.id">
              <!-- Conversation row (acts as its own hover group) -->
              <SidebarMenuButton 
                @click="() => navigateTo(`/chat/${conversation.id}`)"
                :data-active="currentId === conversation.id"
                class="w-full justify-start relative group/item"
              >
                <MessageCircle class="w-4 h-4" />
                <div class="flex flex-col items-start min-w-0 flex-1">
                  <span class="font-medium text-sm truncate w-full">
                    {{ conversation.title }}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatDate(conversation.updatedAt) }}
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <button
                      class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      @click.stop
                      aria-label="Delete conversation"
                    >
                      <Trash2 class="w-4 h-4 text-muted-foreground hover:text-red-600" />
                    </button>
                  </AlertDialogTrigger>

                  <AlertDialogContent class="backdrop-blur-xl bg-background/40">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete conversation</AlertDialogTitle>
                      <AlertDialogDescription class="text-foreground">
                        This action cannot be undone. Are you sure you want to delete this conversation?
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction @click="deleteConversation(conversation.id)" class="bg-destructive text-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    
    <SidebarFooter v-if="user" class="p-4 border-t dark:border-white/20 border-black/20">
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
              <MoreHorizontal class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56 backdrop-blur-xl bg-background/50">
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <!-- Settings -->
            <DropdownMenuItem @click="openSettings" class="cursor-pointer">
              <Settings class="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>

            <!-- GitHub link -->
            <DropdownMenuItem class="cursor-pointer" @click="openGithub">
              <Github class="w-4 h-4 mr-2" />
              GitHub
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <!-- Logout -->
            <DropdownMenuItem @click="logout" class="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut class="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarFooter>
  </Sidebar>

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
import { useColorMode, useCookie, useRoute } from '#imports';
import { computed, inject } from 'vue';
import darkLogo from '@/assets/images/logo/logo1.png';
import lightLogo from '@/assets/images/logo/logo2.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, MessageCircle, Trash2, MoreHorizontal, Settings, Github, LogOut } from 'lucide-vue-next'

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

const props = defineProps<Props>()

const settingsOpen = ref(false)
const colorMode = useColorMode();

const themeCookie = useCookie<string>('nuxt_color_mode');
const currentTheme = computed(() => themeCookie.value || colorMode.preference || colorMode.value);

const logoSrc = computed(() => (currentTheme.value === 'dark' ? darkLogo : lightLogo));
const sortedConversations = computed(() => {
  return [...(props.conversations || [])].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
})

const refreshConversations = inject<() => Promise<void>>('refreshConversations')
const route = useRoute()

function openSettings() {
  settingsOpen.value = true
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    // Force a full page reload to ensure all state is cleared
    if (process.client) {
      window.location.href = '/login'
    } else {
      await navigateTo('/login')
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Even if logout fails, redirect to login page
    if (process.client) {
      window.location.href = '/login'
    } else {
      await navigateTo('/login')
    }
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

function openGithub() {
  if (process.client) {
    window.open('https://github.com/your-repo', '_blank')
  }
}

async function deleteConversation(id: string) {
  try {
    await $fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    // If the deleted conversation is currently open, redirect to /chat
    if (route.params.id === id) {
      await navigateTo('/chat')
    }
    // Refresh list if available
    if (refreshConversations) {
      await refreshConversations()
    }
  } catch (error) {
    console.error('Failed to delete conversation:', error)
  }
}
</script> 