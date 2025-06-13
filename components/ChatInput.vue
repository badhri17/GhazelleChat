<template>
  <!-- Fixed Glossy Input Area -->
  <div class="fixed bottom-0 right-0 z-50 p-6 transition-all duration-200" :class="sidebarOpen ? 'md:left-[280px] left-0' : 'left-0'">
    <div class="max-w-2xl mx-auto">
        
      <form @submit.prevent="handleSendMessage" class="relative">
        <div class="flex items-end gap-4 p-4 bg-background/50 backdrop-blur-xl border border-none rounded-2xl ">
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
            :disabled="!inputMessage.trim() && !isStreaming && !isLoading"
            size="icon"
            :class="[
              'h-9 w-9 text-primary-foreground rounded-xl transition-all duration-300 flex-shrink-0 relative cursor-pointer',
              (!inputMessage.trim() && !isStreaming && !isLoading)
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90 glow-button'
            ]"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
            <Icon v-else-if="isStreaming" name="lucide:square" class="w-4 h-4" />
            <Icon v-else name="lucide:arrow-up" class="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebar } from '@/components/ui/sidebar'

interface Props {
  modelValue: string
  isLoading?: boolean
  isStreaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send-message': [message: string]
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

function handleAddNewLine() {
  inputMessage.value += '\n'
}

function handleSendMessage() {
  console.log('🎯 ChatInput handleSendMessage called', {
    isStreaming: props.isStreaming,
    isLoading: props.isLoading,
    hasMessage: !!inputMessage.value.trim()
  })
  
  if (props.isStreaming) {
    console.log('🛑 Emitting stop-streaming event')
    // If streaming, emit stop event instead
    emit('stop-streaming')
  } else if (inputMessage.value.trim() && !props.isLoading) {
    console.log('📤 Emitting send-message event')
    emit('send-message', inputMessage.value.trim())
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