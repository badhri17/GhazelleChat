<template>
  <!-- Fixed Glossy Input Area -->
  <div class="fixed bottom-0 right-0 z-50 p-6 transition-all duration-200" :class="sidebarOpen ? 'md:left-[280px] left-0' : 'left-0'">
    <div class="max-w-2xl mx-auto">
        
      <form @submit.prevent="handleSendMessage" class="relative">
        <div class="flex items-end gap-4 p-4 bg-background/50 backdrop-blur-xl border border-none rounded-2xl ">
          <!-- Attachment button -->
          <Button
            type="button"
            size="icon"
            @click="triggerFileDialog"
            class="h-9 w-9 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <Paperclip class="w-5 h-5" />
          </Button>
          <input ref="fileInputRef" type="file" class="hidden" multiple accept="image/*,application/pdf" @change="handleFileChange" />

          <Textarea
            ref="textareaRef"
            v-model="inputMessage"
            placeholder="Type your message here..."
            :disabled="isLoading"
            class="flex-1 min-h-[60px] max-h-[200px] resize-none bg-transparent border-0 focus:ring-0 focus:outline-0 text-base leading-relaxed px-4 py-3"
            @keydown.enter.exact.prevent="handleSendMessage"
            @keydown.enter.shift.exact.prevent="handleAddNewLine"
          />

          <Button
            type="submit"
            :disabled="(!(inputMessage?.trim()) && attachments.length === 0) && !isStreaming && !isLoading"
            size="icon"
            :class="[
              'h-9 w-9 text-primary-foreground rounded-xl transition-all duration-300 flex-shrink-0 relative cursor-pointer',
              (!(inputMessage?.trim()) && attachments.length === 0 && !isStreaming && !isLoading)
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 glow-button'
            ]"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
            <Square v-else-if="isStreaming" class="w-4 h-4" />
            <ArrowUp v-else class="w-5 h-5" />
          </Button>
        </div>
      </form>
      <!-- Preview attachments -->
      <div v-if="attachments.length" class="flex gap-2 mt-2 flex-wrap">
        <div v-for="file in attachments" :key="file.id" class="px-3 py-1 text-sm bg-muted rounded-full flex items-center gap-2">
          <Image v-if="file.mimeType.startsWith('image/')" class="w-4 h-4" />
          <FileText v-else class="w-4 h-4" />
          <span>{{ file.fileName }}</span>
          <button type="button" @click="attachments = attachments.filter(a => a.id !== file.id)" class="text-muted-foreground hover:text-foreground">
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebar } from '@/components/ui/sidebar'
import { toast } from 'vue-sonner'
import { validateAttachment } from '@/lib/attachmentRules'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, X, Loader2, Square, ArrowUp, Image, FileText } from 'lucide-vue-next'

interface UploadedAttachment {
  id: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

interface Props {
  modelValue: string // v-model for the input text
  currentModel: string // selected LLM model
  isLoading?: boolean
  isStreaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send-message': [message: string, attachments: UploadedAttachment[]]
  'stop-streaming': []
}>()

const textareaRef = ref()

// Get sidebar state
const { state } = useSidebar()
const sidebarOpen = computed(() => state.value === 'expanded')

const inputMessage = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const attachments = ref<UploadedAttachment[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleAddNewLine() {
  inputMessage.value += '\n'
}

function triggerFileDialog() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  const files = Array.from(input.files)

  const model = props.currentModel

  for (const file of files) {
    const validationErr = validateAttachment(model, { mimeType: file.type, size: file.size })
    if (validationErr) {
      toast.error(validationErr)
      continue
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      const data = await res.json()
      attachments.value.push(data)
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`)
    }
  }
  // Reset input so selecting same file again triggers change
  input.value = ''
}

function handleSendMessage() {
  console.log('🎯 ChatInput handleSendMessage called', {
    isStreaming: props.isStreaming,
    isLoading: props.isLoading,
    hasMessage: !!(inputMessage.value?.trim())
  })
  
  if (props.isStreaming) {
    console.log('🛑 Emitting stop-streaming event')
    // If streaming, emit stop event instead
    emit('stop-streaming')
  } else if ((inputMessage.value?.trim() || attachments.value.length) && !props.isLoading) {
    console.log('📤 Emitting send-message event')
    const messageText = inputMessage.value?.trim() || ''
    emit('send-message', messageText, attachments.value)
    // clear locals
    inputMessage.value = ''
    attachments.value = []
  }
}

// Auto-focus textarea on mount
onMounted(() => {
  nextTick(() => {
    const textarea = textareaRef.value?.$el || textareaRef.value
    if (textarea && textarea.focus) {
      textarea.focus()
    }
  })
})

// Expose focus method
defineExpose({
  focus() {
    nextTick(() => {
      const textarea = textareaRef.value?.$el || textareaRef.value
      if (textarea && textarea.focus) {
        textarea.focus()
      }
    })
  }
})
</script>
<style>
.glow-button {
  position: relative;
  animation: glow-pulse 2s ease-in-out infinite alternate;
}

.glow-button:hover {
  animation: glow-pulse-intense 1.5s ease-in-out infinite alternate;
}

@keyframes glow-pulse {
  0% {
    box-shadow: 
      0 0 15px rgba(255, 140, 0, 0.2),
      0 0 25px rgba(255, 140, 0, 0.1),
      0 0 35px rgba(255, 140, 0, 0.05);
  }
  100% {
    box-shadow: 
      0 0 20px rgba(255, 140, 0, 0.3),
      0 0 35px rgba(255, 140, 0, 0.2),
      0 0 50px rgba(255, 140, 0, 0.1);
  }
}

@keyframes glow-pulse-intense {
  0% {
    box-shadow: 
      0 0 20px rgba(255, 140, 0, 0.3),
      0 0 30px rgba(255, 140, 0, 0.2),
      0 0 45px rgba(255, 140, 0, 0.1);
  }
  100% {
    box-shadow: 
      0 0 25px rgba(255, 140, 0, 0.5),
      0 0 45px rgba(255, 140, 0, 0.3),
      0 0 70px rgba(255, 140, 0, 0.2);
  }
}

.dark .glow-button {
  animation: glow-pulse-dark 2s ease-in-out infinite alternate;
}

.dark .glow-button:hover {
  animation: glow-pulse-dark-intense 1.5s ease-in-out infinite alternate;
}

@keyframes glow-pulse-dark {
  0% {
    box-shadow: 
      0 0 20px rgba(255, 140, 0, 0.3),
      0 0 30px rgba(255, 140, 0, 0.2),
      0 0 40px rgba(255, 140, 0, 0.1);
  }
  100% {
    box-shadow: 
      0 0 25px rgba(255, 140, 0, 0.4),
      0 0 40px rgba(255, 140, 0, 0.3),
      0 0 60px rgba(255, 140, 0, 0.2);
  }
}

@keyframes glow-pulse-dark-intense {
  0% {
    box-shadow: 
      0 0 25px rgba(255, 140, 0, 0.4),
      0 0 35px rgba(255, 140, 0, 0.3),
      0 0 50px rgba(255, 140, 0, 0.2);
  }
  100% {
    box-shadow: 
      0 0 30px rgba(255, 140, 0, 0.6),
      0 0 50px rgba(255, 140, 0, 0.4),
      0 0 80px rgba(255, 140, 0, 0.3);
  }
}
</style> 