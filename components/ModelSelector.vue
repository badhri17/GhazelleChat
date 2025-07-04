<template>
  <Select v-model="internalValue" class="w-48">
    <SelectTrigger class="bg-background/60 backdrop-blur-lg border border-border/40 hover:bg-background/80 focus:bg-background/80 transition-all duration-200  rounded-lg">
      <div class="flex items-center gap-2">
        <Icon :name="modelIcon" class="w-4 h-4" />
        <SelectValue placeholder="Select model" />
      </div>
    </SelectTrigger>
    <SelectContent class="bg-background/50 backdrop-blur-xl border border-border/40  ">
      <SelectGroup>
        <SelectLabel class="flex items-center gap-2">
          <Icon name="simple-icons:openai" class="w-4 h-4" />
          OpenAI
        </SelectLabel>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel class="flex items-center gap-2">
          <Icon name="simple-icons:anthropic" class="w-4 h-4" />
          Anthropic
        </SelectLabel>
        <SelectItem value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</SelectItem>
        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
        <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel class="flex items-center gap-2">
          <Icon name="simple-icons:google" class="w-4 h-4" />
          Google Gemini
        </SelectLabel>
        <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
        <SelectItem value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel class="flex items-center gap-2">
          <Icon name="simple-icons:ollama" class="w-4 h-4" />
          Groq
        </SelectLabel>
        <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const internalValue = ref(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  internalValue.value = newValue
})

// Watch for internal changes and emit
watch(internalValue, (newValue) => {
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue)
  }
})

const modelIcon = computed(() => {
  const value = internalValue.value
  if (value.startsWith('gpt-')) return 'simple-icons:openai'
  if (value.startsWith('claude-')) return 'simple-icons:anthropic'
  if (value.startsWith('llama-')) return 'simple-icons:llama'
  if (value.startsWith('gemini-')) return 'simple-icons:google'
  return 'simple-icons:openai' // Default icon
})
</script> 