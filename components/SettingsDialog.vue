<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
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

                <!-- Right Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Tab Content with Transition -->
          <Transition name="slide-fade" mode="out-in">
            <!-- General Tab -->
            <div v-if="activeTab === 'general'" key="general" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">General Settings</h3>
                
                <!-- Theme Section -->
                <div class="space-y-3">
                  <label class="text-sm font-medium">Theme</label>
                  <Select v-model="settings.theme">
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Language Section -->
                <div class="space-y-3">
                  <label class="text-sm font-medium">Language</label>
                  <Select v-model="settings.language">
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto-detect">Auto-detect</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <!-- Follow Up Toggle -->
                <div class="flex items-center justify-between py-3">
                  <div>
                    <div class="text-sm font-medium">Show follow up suggestions</div>
                    <div class="text-xs text-muted-foreground">Display suggested questions after responses</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    @click="settings.showFollowUp = !settings.showFollowUp"
                    :class="[
                      'transition-all duration-200 ease-in-out',
                      settings.showFollowUp ? 'bg-primary text-primary-foreground' : ''
                    ]"
                  >
                    {{ settings.showFollowUp ? 'On' : 'Off' }}
                  </Button>
                </div>

                <!-- Code Analyst Toggle -->
                <div class="flex items-center justify-between py-3">
                  <div>
                    <div class="text-sm font-medium">Always show code when using data analyst</div>
                    <div class="text-xs text-muted-foreground">Display code blocks automatically</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    @click="settings.showCodeAnalyst = !settings.showCodeAnalyst"
                    :class="[
                      'transition-all duration-200 ease-in-out',
                      settings.showCodeAnalyst ? 'bg-primary text-primary-foreground' : ''
                    ]"
                  >
                    {{ settings.showCodeAnalyst ? 'On' : 'Off' }}
                  </Button>
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
                  <Button variant="outline" size="sm" class="transition-all duration-200 hover:scale-105">
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
                  <Button variant="outline" size="sm" class="transition-all duration-200 hover:scale-105">
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
                  <Button variant="outline" size="sm" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:download" class="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <!-- Delete All -->
                <div class="flex items-center justify-between py-3 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                  <div>
                    <div class="text-sm font-medium">Delete all chats</div>
                    <div class="text-xs text-muted-foreground text-red-600">This action cannot be undone</div>
                  </div>
                  <Button variant="destructive" size="sm" class="transition-all duration-200 hover:scale-105">
                    <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                    Delete all
                  </Button>
                </div>
              </div>
            </div>

            <!-- Notifications Tab -->
            <div v-else-if="activeTab === 'notifications'" key="notifications" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Notifications</h3>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-between py-3">
                    <div>
                      <div class="text-sm font-medium">Email notifications</div>
                      <div class="text-xs text-muted-foreground">Receive updates via email</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="settings.emailNotifications = !settings.emailNotifications"
                      :class="[
                        'transition-all duration-200 ease-in-out',
                        settings.emailNotifications ? 'bg-primary text-primary-foreground' : ''
                      ]"
                    >
                      {{ settings.emailNotifications ? 'On' : 'Off' }}
                    </Button>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div>
                      <div class="text-sm font-medium">Push notifications</div>
                      <div class="text-xs text-muted-foreground">Browser notifications for new messages</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="settings.pushNotifications = !settings.pushNotifications"
                      :class="[
                        'transition-all duration-200 ease-in-out',
                        settings.pushNotifications ? 'bg-primary text-primary-foreground' : ''
                      ]"
                    >
                      {{ settings.pushNotifications ? 'On' : 'Off' }}
                    </Button>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div>
                      <div class="text-sm font-medium">Sound notifications</div>
                      <div class="text-xs text-muted-foreground">Play sound when receiving messages</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="settings.soundNotifications = !settings.soundNotifications"
                      :class="[
                        'transition-all duration-200 ease-in-out',
                        settings.soundNotifications ? 'bg-primary text-primary-foreground' : ''
                      ]"
                    >
                      {{ settings.soundNotifications ? 'On' : 'Off' }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Personalization Tab -->
            <div v-else-if="activeTab === 'personalization'" key="personalization" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Personalization</h3>
                
                <div class="space-y-4">
                  <!-- Model Preference -->
                  <div class="space-y-3">
                    <label class="text-sm font-medium">Preferred AI Model</label>
                    <Select v-model="settings.preferredModel">
                      <SelectTrigger class="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</SelectItem>
                        <SelectItem value="llama-3-70b">Llama 3 70B (Groq)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Response Style -->
                  <div class="space-y-3">
                    <label class="text-sm font-medium">Response Style</label>
                    <Select v-model="settings.responseStyle">
                      <SelectTrigger class="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="precise">Precise</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div>
                      <div class="text-sm font-medium">Show model in responses</div>
                      <div class="text-xs text-muted-foreground">Display which AI model generated the response</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="settings.showModel = !settings.showModel"
                      :class="[
                        'transition-all duration-200 ease-in-out',
                        settings.showModel ? 'bg-primary text-primary-foreground' : ''
                      ]"
                    >
                      {{ settings.showModel ? 'On' : 'Off' }}
                    </Button>
                  </div>
                </div>
              </div>
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
                        <span class="text-sm font-medium">{{ user?.email?.[0]?.toUpperCase() || 'U' }}</span>
                      </div>
                      <div>
                        <div class="font-medium">{{ user?.email }}</div>
                        <div class="text-sm text-muted-foreground">Free Plan</div>
                      </div>
                    </div>
                  </div>

                  <!-- Change Password -->
                  <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                    <div>
                      <div class="text-sm font-medium">Change password</div>
                      <div class="text-xs text-muted-foreground">Update your account password</div>
                    </div>
                    <Button variant="outline" size="sm" class="transition-all duration-200 hover:scale-105">
                      <Icon name="lucide:key" class="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>

                  <!-- Two-Factor Auth -->
                  <div class="flex items-center justify-between py-3 border-b transition-colors duration-200 hover:bg-muted/50">
                    <div>
                      <div class="text-sm font-medium">Two-factor authentication</div>
                      <div class="text-xs text-muted-foreground">Add an extra layer of security</div>
                    </div>
                    <Button variant="outline" size="sm" class="transition-all duration-200 hover:scale-105">
                      <Icon name="lucide:shield" class="w-4 h-4 mr-2" />
                      Setup
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

interface User {
  id: string
  email: string
}

interface Props {
  open: boolean
  user?: User | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'logout'): void
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
  { id: 'chat', label: 'Chat Management', icon: 'lucide:message-square' },
  { id: 'notifications', label: 'Notifications', icon: 'lucide:bell' },
  { id: 'personalization', label: 'Personalization', icon: 'lucide:user' },
  { id: 'account', label: 'Account & Security', icon: 'lucide:shield' },
]

const settings = reactive({
  theme: 'system',
  language: 'auto-detect',
  showFollowUp: true,
  showCodeAnalyst: true,
  emailNotifications: true,
  pushNotifications: false,
  soundNotifications: true,
  preferredModel: 'gpt-4o',
  responseStyle: 'balanced',
  showModel: false,
})

function logout() {
  emit('logout')
}

// Watch for settings changes and save to localStorage
watchEffect(() => {
  if (process.client) {
    localStorage.setItem('ghazelle-settings', JSON.stringify(settings))
  }
})

// Load settings from localStorage on mount
onMounted(() => {
  if (process.client) {
    const saved = localStorage.getItem('ghazelle-settings')
    if (saved) {
      Object.assign(settings, JSON.parse(saved))
    }
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