<template>
  <div class="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
    <div class="mb-8">
      <h1 class="text-4xl md:text-5xl font-light text-center mb-4">
        {{ title }}
      </h1>
      <p class="text-lg text-foreground text-center">
        {{ subtitle }}
      </p>
    </div>
    
    <div class="w-full max-w-2xl">
      <div class="relative">
        <Textarea
          :model-value="message"
          @update:model-value="(val) => $emit('update:message', String(val))"
          placeholder="What would you like to know?"
          class="min-h-[120px] text-lg px-6 py-4 resize-none border-2 rounded-3xl shadow-sm hover:shadow-md transition-shadow focus:shadow-lg bg-background/20 backdrop-blur-xl border-none pr-24"
          :disabled="isLoading || isStreaming"
          @keydown.enter.prevent="handleSend"
        />
        <input ref="fileInputRef" type="file" class="hidden" multiple accept="image/*,application/pdf" @change="handleFileChange" />
        
        <!-- Attachment button (absolute positioned) -->
        <Button
          type="button"
          size="icon"
          @click="triggerFileDialog"
          class="absolute left-4 bottom-4 h-9 w-9 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted/80 transition-colors"
          :disabled="isLoading || isStreaming"
        >
          <Paperclip class="w-5 h-5" />
        </Button>
        <div class="absolute bottom-4 right-4 flex items-center gap-2">
          <Button
            v-if="isLoading || isStreaming"
            @click="handleStop"
            size="sm"
            variant="outline"
            class="rounded-full h-10 w-10 p-0"
          >
            <Icon name="lucide:square" class="w-4 h-4" />
          </Button>
          <Button
            v-else-if="message.trim() || attachments.length"
            @click="handleSend"
            size="sm"
            class="rounded-full h-10 w-10 p-0"
            :disabled="isLoading || isStreaming"
          >
            <Icon name="lucide:arrow-right" class="w-5 h-5" />
          </Button>
        </div>
      </div>

      <!-- Preview attachments -->
      <div v-if="attachments.length" class="flex gap-2 mt-3 flex-wrap relative">
        <div 
          v-for="file in attachments" 
          :key="file.id" 
          class="px-3 py-2 text-sm bg-background/30 backdrop-blur-xl rounded-full flex items-center gap-2 border-none relative cursor-pointer transition-all hover:bg-background/50"
          @mouseenter="file.mimeType.startsWith('image/') && (hoveredImageId = file.id)"
          @mouseleave="hoveredImageId = null"
        >
          <Image v-if="file.mimeType.startsWith('image/')" class="w-4 h-4" />
          <FileText v-else class="w-4 h-4" />
          <span>{{ file.fileName }}</span>
          <button type="button" @click="removeAttachment(file.id)" class="text-muted-foreground hover:text-foreground">
            <X class="w-3 h-3" />
          </button>
          
          <!-- Image Preview on Hover -->
          <div 
            v-if="hoveredImageId === file.id && file.mimeType.startsWith('image/')"
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div class="bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg p-2 shadow-2xl">
              <img 
                :src="file.url" 
                :alt="file.fileName"
                class="max-w-xs max-h-48 object-contain rounded-md"
                loading="lazy"
              />
              <p class="text-xs text-muted-foreground mt-1 text-center">{{ file.fileName }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-3 mt-6">
        <Button
          v-for="suggestion in quickSuggestions"
          :key="suggestion"
          @click="handleSuggestionClick(suggestion)"
          variant="outline"
          size="sm"
          class="rounded-full bg-background/20 backdrop-blur-xl border-none"
          :disabled="isLoading || isStreaming"
        >
          {{ suggestion }}
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading || isStreaming" class="mt-8 text-center">
        <Icon name="lucide:loader-2" class="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
        <p class="text-sm text-muted-foreground">
          {{ isStreaming ? 'AI is responding...' : 'Sending message...' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Paperclip, Image, FileText, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { validateAttachment } from '@/lib/attachmentRules'

interface UploadedAttachment {
  id: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

interface Props {
  title: string
  subtitle?: string
  message: string
  isLoading?: boolean
  isStreaming?: boolean
  currentModel?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false,
  currentModel: 'gpt-4o-mini'
})

const emit = defineEmits<{
  'update:message': [value: string]
  'send': [message: string, attachments: UploadedAttachment[]]
  'stop': []
}>()

const quickSuggestions = [
  'Explain quantum computing',
  'Help me write an email', 
  'Plan a vacation itinerary',
  'Debug my code',
  'Create a recipe'
]

const attachments = ref<UploadedAttachment[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const hoveredImageId = ref<string | null>(null)

const handleSuggestionClick = (suggestion: string) => {
  emit('update:message', suggestion)
}

const handleSend = () => {
  if ((props.message.trim() || attachments.value.length) && !props.isLoading && !props.isStreaming) {
    emit('send', props.message.trim(), [...attachments.value])
    // Clear attachments after sending
    attachments.value = []
  }
}

const handleStop = () => {
  emit('stop')
}

const triggerFileDialog = () => {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  const files = Array.from(input.files)

  const model = props.currentModel || 'gpt-4o-mini'

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

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id)
}
</script> 