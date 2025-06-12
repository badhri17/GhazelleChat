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
            :disabled="!inputMessage.trim() || isLoading"
            size="icon"
            class="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl  transition-all duration-200 flex-shrink-0"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
            <Icon v-else name="lucide:send" class="w-5 h-5" />
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
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send-message': [message: string]
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
  if (inputMessage.value.trim() && !props.isLoading) {
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