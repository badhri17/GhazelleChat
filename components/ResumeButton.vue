<template>
  <div v-if="message.status === 'incomplete'" class="mt-2 flex items-center gap-2">
    <Button 
      @click="resumeGeneration"
      :disabled="isResuming"
      variant="outline"
      size="sm"
      class="text-xs bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950 dark:hover:bg-orange-900 dark:border-orange-800 dark:text-orange-300"
    >
      <Icon v-if="isResuming" name="lucide:loader-2" class="w-3 h-3 mr-1 animate-spin" />
      <Icon v-else name="lucide:play" class="w-3 h-3 mr-1" />
      {{ isResuming ? 'Resuming...' : 'Continue Generation' }}
    </Button>
    <span class="text-xs text-muted-foreground">
      Generation was interrupted
    </span>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  status?: string
  createdAt: Date
}

interface Props {
  message: Message
  conversationId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'resume-started': []
  'resume-completed': [content: string]
  'resume-error': [error: string]
}>()

const isResuming = ref(false)

async function resumeGeneration() {
  if (isResuming.value) return
  
  isResuming.value = true
  emit('resume-started')
  
  try {
    console.log('🔄 Starting resume for message:', props.message.id)
    
    const response = await fetch('/api/chat/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId: props.message.id,
        conversationId: props.conversationId,
        model: props.message.model || 'gpt-4o-mini'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to resume generation')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    let resumedContent = props.message.content

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.content) {
              resumedContent += data.content
              emit('resume-completed', resumedContent)
            }
            
            if (data.done) {
              console.log('✅ Resume completed successfully')
              toast.success('Generation resumed successfully', {
                duration: 3000
              })
              return
            }
            
            if (data.error) {
              throw new Error(data.error)
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Resume error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to resume generation'
    emit('resume-error', errorMessage)
    toast.error('Failed to resume generation', {
      description: errorMessage,
      duration: 5000
    })
  } finally {
    isResuming.value = false
  }
}
</script> 