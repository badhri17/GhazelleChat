<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[750px] max-h-[80vh] overflow-hidden bg-background/90 dark:bg-background/50 backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle class="text-xl font-semibold">Settings</DialogTitle>
      </DialogHeader>
      
      <div class="flex gap-6 h-[500px]">
        <!-- Left Navigation -->
        <div class="w-52 space-y-1 border-r pr-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md w-full text-left transition-all duration-200 ease-in-out transform',
              activeTab === tab.id 
                ? 'bg-muted text-foreground shadow-sm scale-[1.02]' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:scale-[1.01] hover:shadow-sm'
            ]"
          >
            <Icon :name="tab.icon" class="w-4 h-4 transition-transform duration-200" :class="activeTab === tab.id ? 'scale-110' : ''" />
            {{ tab.label }}
          </button>
        </div>
        <div class="flex-1 overflow-y-auto overflow-x-visible">
          <Transition name="slide-fade" mode="out-in">
            <div v-if="activeTab === 'general'" key="general" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">General Settings</h3>
                
                <!-- Theme Section -->
                <div class="space-y-3 flex flex-col">
                  <label class="text-sm font-medium gap-2">Theme</label>
                  <Select v-model="settings.theme">
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="w-full bg-background/50 backdrop-blur-xl">
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Language Section -->
                <div class="space-y-3 flex flex-col mt-4">
                  <label class="text-sm font-medium gap-2">Language</label>
                  <Select v-model="settings.language" class="">
                    <SelectTrigger class="w-full" >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="w-full bg-background/50 backdrop-blur-xl">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- System Prompt -->
                <div class="space-y-3 flex flex-col mt-4">
                  <label class="text-sm font-medium gap-2" for="systemPrompt">System Prompt</label>
                  <textarea
                    id="systemPrompt"
                    v-model="settings.systemPrompt"
                    rows="3"
                    placeholder="Optional instructions that will be sent to the model at the start of every chat"
                    class="w-full px-3 py-2 rounded-md border border-border bg-background/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  ></textarea>
                  <div class="text-xs text-muted-foreground">Leave empty to disable.</div>
                </div>
              </div>
            </div>

            <!-- Background Tab -->
            <div v-else-if="activeTab === 'background'" key="background" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Background Selection</h3>
                
                <div class="space-y-4">
                  <p class="text-sm text-muted-foreground">Choose your preferred background image</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      v-for="background in availableBackgrounds" 
                      :key="background.id"
                      @click="setBackground(background.id)"
                      :class="[
                        'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                        currentBackground === background.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      ]"
                    >
                      <img 
                        :src="background.path" 
                        :alt="background.name"
                        class="w-full h-24 object-cover"
                      />
                      <div class="absolute inset-0 bg-black/30 flex items-end">
                        <div class="p-3 w-full">
                          <div class="text-white font-medium text-sm">{{ background.name }}</div>
                        </div>
                      </div>
                      <div 
                        v-if="currentBackground === background.id"
                        class="absolute top-2 right-2 bg-primary rounded-full p-1"
                      >
                        <Icon name="lucide:check" class="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chat Management Tab -->
            <div v-else-if="activeTab === 'chat'" key="chat" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Chat Management</h3>
                
                <!-- Archived Chats -->
                <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                  <div>
                    <div class="text-sm font-medium">Archived chats</div>
                    <div class="text-xs text-muted-foreground">View and manage archived conversations</div>
                  </div>
                  <Button variant="outline" size="sm" @click="showComingSoonToast" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:archive" class="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>

                <!-- Archive All -->
                <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                  <div>
                    <div class="text-sm font-medium">Archive all chats</div>
                    <div class="text-xs text-muted-foreground">Move all conversations to archive</div>
                  </div>
                  <Button variant="outline" size="sm" @click="showComingSoonToast" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:archive" class="w-4 h-4 mr-2" />
                    Archive all
                  </Button>
                </div>

                <!-- Export Chats -->
                <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                  <div>
                    <div class="text-sm font-medium">Export chats</div>
                    <div class="text-xs text-muted-foreground">Download your conversation history</div>
                  </div>
                  <Button variant="outline" size="sm" @click="showComingSoonToast" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:download" class="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <!-- Delete All -->
                <div class="flex items-center justify-between py-3 pr-2 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                  <div>
                    <div class="text-sm font-medium">Delete all chats</div>
                    <div class="text-xs  text-red-600">This action cannot be undone</div>
                  </div>
                  <Button variant="destructive" size="sm" @click="showComingSoonToast" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                    Delete all
                  </Button>
                </div>
              </div>
            </div>

            <!-- Shortcuts Tab -->
            <div v-else-if="activeTab === 'shortcuts'" key="shortcuts" class="space-y-6">
              <h3 class="text-lg font-medium mb-4">Keyboard Shortcuts</h3>
              <ul class="space-y-2 text-sm">
                <li>
                  <kbd class="border px-1 py-0.5 rounded">Ctrl + B</kbd>
                  <span class="mx-1">/</span>
                  <kbd class="border px-1 py-0.5 rounded">⌘B</kbd>
                  <span class="ml-2">Toggle sidebar</span>
                </li>
                <li>
                  <kbd class="border px-1 py-0.5 rounded">Ctrl + K</kbd>
                  <span class="mx-1">/</span>
                  <kbd class="border px-1 py-0.5 rounded">⌘K</kbd>
                  <span class="ml-2">Search conversations</span>
                </li>
                <li>
                  <kbd class="border px-1 py-0.5 rounded">Ctrl + Shift + O</kbd>
                  <span class="mx-1">/</span>
                  <kbd class="border px-1 py-0.5 rounded">⌘⇧O</kbd>
                  <span class="ml-2">New chat</span>
                </li>
              </ul>
            </div>

            <!-- Account Tab -->
            <div v-else-if="activeTab === 'account'" key="account" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Account & Security</h3>
                
                <div class="space-y-4">
                  <!-- Account Info -->
                  <div class="p-4 border rounded-lg transition-all duration-200 hover:border-border/60">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 hover:bg-primary/20">
                        <span class="text-sm font-medium">{{ user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U' }}</span>
                      </div>
                      <div>
                        <div class="font-medium">{{ user?.fullName || user?.email }}</div>
                        <div class="text-sm text-muted-foreground">{{ user?.email }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Change Name -->
                  <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                    <div>
                      <div class="text-sm font-medium">Change name</div>
                      <div class="text-xs text-muted-foreground">Update your display name</div>
                    </div>
                    <Button variant="outline" size="sm" @click="showChangeNameDialog = true" class="transition-all duration-200 hover:scale-105">
                      <Icon name="lucide:user" class="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>
                  <div class="flex items-center justify-between py-3  transition-colors duration-200 hover:bg-muted/50">
                    <div>
                      <div class="text-sm font-medium">Change password</div>
                      <div class="text-xs text-muted-foreground">Update your account password</div>
                    </div>
                    <Button variant="outline" size="sm" @click="showChangePasswordDialog = true" class="transition-all duration-200 hover:scale-105">
                      <Icon name="lucide:key" class="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>

                  <!-- Log Out -->
                  <div class="flex items-center justify-between py-3 pt-6 border-t transition-colors duration-200 hover:bg-muted/50">
                    <div>
                      <div class="text-sm font-medium">Log out on this device</div>
                      <div class="text-xs text-muted-foreground">Sign out of your account</div>
                    </div>
                    <Button variant="outline" size="sm" @click="logout" class="transition-all duration-200 hover:scale-105">
                      <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
                      Log out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </DialogContent>

    <!-- Change Name Dialog -->
    <Dialog v-model:open="showChangeNameDialog">
      <DialogContent class="sm:max-w-[425px] bg-background/50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Change Name</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleChangeName" class="space-y-8">
          <div class="space-y-12">
            <label for="newName" class="text-sm font-medium">New Name</label>
            <input
              id="newName"
              v-model="newName"
              type="text"
              required
              class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-2"
              placeholder="Enter your new name"
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="showChangeNameDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="!newName.trim() || changingName">
              {{ changingName ? 'Changing...' : 'Change Name' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Change Password Dialog -->
    <Dialog v-model:open="showChangePasswordDialog">
      <DialogContent class="sm:max-w-[425px] bg-background/50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div class="space-y-2">
            <label for="oldPassword" class="text-sm font-medium">Current Password</label>
            <input
              id="oldPassword"
              v-model="oldPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your current password"
            />
          </div>
          <div class="space-y-2">
            <label for="newPassword" class="text-sm font-medium">New Password</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your new password"
            />
          </div>
          <div class="space-y-2">
            <label for="confirmPassword" class="text-sm font-medium">Confirm New Password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirm your new password"
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="showChangePasswordDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="!isPasswordFormValid || changingPassword">
              {{ changingPassword ? 'Changing...' : 'Change Password' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { computed, ref, watch, onMounted } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { Check, Archive, Download, Trash2, User, KeyRound, LogOut } from 'lucide-vue-next'

interface User {
  id: string
  email: string
  fullName: string
}

interface Props {
  open: boolean
  user?: User | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'logout'): void
  (e: 'user-updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const activeTab = ref('general')

const tabs = [
  { id: 'general', label: 'General', icon: 'lucide:settings' },
  { id: 'background', label: 'Background', icon: 'lucide:picture-in-picture' },
  { id: 'chat', label: 'Chat Management', icon: 'lucide:message-circle' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'lucide:keyboard' },
  { id: 'account', label: 'Account', icon: 'lucide:user' },
]

const { settings } = useSettings()

// Dialog states
const showChangeNameDialog = ref(false)
const showChangePasswordDialog = ref(false)

const newName = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingName = ref(false)
const changingPassword = ref(false)

const isPasswordFormValid = computed(() => {
  return oldPassword.value.trim() && 
         newPassword.value.length >= 8 && 
         newPassword.value === confirmPassword.value
})

const { availableBackgrounds, currentBackground, setBackground } = useBackground()

watch(currentBackground, (newValue) => {
  console.log('Background changed to:', newValue)
})

// Methods
async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    emit('update:open', false)
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

function showComingSoonToast() {
  toast.info('Coming soon!')
}

async function handleChangeName() {
  if (!newName.value.trim()) return
  
  changingName.value = true
  try {
    await $fetch('/api/account/name', {
      method: 'PUT',
      body: { newName: newName.value.trim() },
    })

    showChangeNameDialog.value = false
    toast.success('Name changed successfully!')

    // Notify parent so it can refresh user data if needed
    emit('user-updated')

    // Optimistically update local user name if prop provided
    if (props.user) {
      // @ts-ignore – prop is readonly, but we explicitly cast for local update
      (props.user as any).fullName = newName.value.trim()
    }
  } catch (error: any) {
    console.error('Error changing name:', error)
    const msg = error?.statusMessage || error?.message || 'Failed to change name.'
    toast.error(msg)
  } finally {
    newName.value = ''
    changingName.value = false
  }
}

async function handleChangePassword() {
  if (!isPasswordFormValid.value) return
  
  changingPassword.value = true
  try {
    await $fetch('/api/account/password', {
      method: 'PUT',
      body: {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
      },
    })

    showChangePasswordDialog.value = false
    toast.success('Password changed successfully!')
    emit('user-updated')
  } catch (error: any) {
    console.error('Error changing password:', error)
    const msg = error?.statusMessage || error?.message || 'Failed to change password.'
    toast.error(msg)
  } finally {
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    changingPassword.value = false
  }
}

// Reset form when dialogs are closed
watch(showChangeNameDialog, (newValue) => {
  if (!newValue) {
    newName.value = ''
  }
})

watch(showChangePasswordDialog, (newValue) => {
  if (!newValue) {
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
})

// ─────── Theme synchronization with global color mode ───────
const colorMode = useColorMode()

// initialize setting to current mode on mount (light/dark)
onMounted(() => {
  // The useSettings composable now handles loading, but we still need to sync theme with colorMode
  if (settings.theme !== colorMode.value) {
    settings.theme = colorMode.value as 'light' | 'dark'
  }
})

// when select changes -> update global color mode
watch(() => settings.theme, (val) => {
  if (val && colorMode.preference !== val) {
    colorMode.preference = val
  }
})

// keep select in sync when toggle button changes theme elsewhere
watch(() => colorMode.value, (val) => {
  if (val && settings.theme !== val) {
    settings.theme = val as 'light' | 'dark'
  }
})
</script>

<style scoped>
/* Slide fade transition for tab content */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translateX(0);
  opacity: 1;
}
</style> 