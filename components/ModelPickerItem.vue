<template>
  <CommandItem
    :value="model.id"
    class="flex items-center gap-2 px-2 py-1.5"
    @select="emit('select')"
  >
    <Icon :name="providerIcon" class="w-4 h-4 shrink-0 text-muted-foreground" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="text-sm truncate" :class="{ 'font-medium': selected }">{{ model.label }}</span>
        <Badge
          v-for="badge in visibleBadges"
          :key="badge"
          variant="secondary"
          class="text-[10px] px-1.5 py-0 h-4 leading-none"
        >
          {{ badge }}
        </Badge>
        <span
          v-if="model.routeType === 'openrouter'"
          class="text-[10px] text-muted-foreground/60 ml-auto shrink-0"
        >
          via OpenRouter
        </span>
      </div>
    </div>
    <Icon v-if="selected" name="lucide:check" class="w-4 h-4 shrink-0 text-primary" />
  </CommandItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CommandItem } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { getProviderIcon } from '@/lib/models/helpers'
import type { ModelEntry } from '@/lib/models/types'

const props = defineProps<{
  model: ModelEntry
  selected: boolean
}>()

const emit = defineEmits<{ select: [] }>()

const providerIcon = computed(() => getProviderIcon(props.model.provider))

const visibleBadges = computed(() => props.model.badges.slice(0, 2))
</script>
