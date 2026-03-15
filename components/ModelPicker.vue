<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border/40 bg-background/60 backdrop-blur-lg hover:bg-background/80 transition-all duration-200 cursor-pointer select-none whitespace-nowrap"
      >
        <Icon :name="currentIcon" class="w-4 h-4 shrink-0" />
        <span class="truncate max-w-[140px]">{{ currentLabel }}</span>
        <Icon name="lucide:chevrons-up-down" class="w-3 h-3 text-muted-foreground shrink-0" />
      </button>
    </PopoverTrigger>

    <PopoverContent class="w-[320px] p-0" :side-offset="8" align="start">
      <Command :filter-function="filterModels">
        <CommandInput placeholder="Search models..." />
        <CommandList class="max-h-[340px]">
          <CommandEmpty>No models found.</CommandEmpty>

          <!-- Pinned -->
          <CommandGroup v-if="pinnedModels.length > 0" heading="Pinned">
            <ModelPickerItem
              v-for="m in pinnedModels"
              :key="'pin-' + m.id"
              :model="m"
              :selected="m.id === modelValue"
              @select="selectModel(m.id)"
            />
          </CommandGroup>

          <!-- Recents -->
          <CommandGroup v-if="recentModels.length > 0" heading="Recent">
            <ModelPickerItem
              v-for="m in recentModels"
              :key="'rec-' + m.id"
              :model="m"
              :selected="m.id === modelValue"
              @select="selectModel(m.id)"
            />
          </CommandGroup>

          <!-- Grouped models -->
          <CommandGroup
            v-for="group in groupedModels"
            :key="group.label"
            :heading="group.label"
          >
            <ModelPickerItem
              v-for="m in group.models"
              :key="m.id"
              :model="m"
              :selected="m.id === modelValue"
              @select="selectModel(m.id)"
            />
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup>
            <CommandItem value="__browse_more__" class="justify-center text-muted-foreground" @select="openBrowseDrawer">
              <Icon name="lucide:layers" class="w-4 h-4 mr-2" />
              Browse more models...
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  <ModelBrowseDrawer
    v-model:open="drawerOpen"
    :current-model="modelValue"
    @select="selectModel"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command'
import ModelPickerItem from '@/components/ModelPickerItem.vue'
import ModelBrowseDrawer from '@/components/ModelBrowseDrawer.vue'
import {
  getModel, getGroupedModels, getEnabledModels, getProviderIcon, getModelLabel,
} from '@/lib/models/helpers'
import { useModelPreferences } from '@/composables/useModelPreferences'
import type { ModelEntry } from '@/lib/models/types'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { prefs, addRecent } = useModelPreferences()
const open = ref(false)
const drawerOpen = ref(false)

const currentLabel = computed(() => getModelLabel(props.modelValue))
const currentIcon = computed(() => {
  const m = getModel(props.modelValue)
  return m ? getProviderIcon(m.provider) : 'lucide:cpu'
})

const groupedModels = computed(() => getGroupedModels())

const pinnedModels = computed(() => {
  const enabled = getEnabledModels()
  return prefs.pinned
    .map(id => enabled.find(m => m.id === id))
    .filter((m): m is ModelEntry => !!m)
})

const recentModels = computed(() => {
  const enabled = getEnabledModels()
  const pinnedSet = new Set(prefs.pinned)
  return prefs.recents
    .filter(id => !pinnedSet.has(id) && id !== props.modelValue)
    .slice(0, 3)
    .map(id => enabled.find(m => m.id === id))
    .filter((m): m is ModelEntry => !!m)
})

function selectModel(id: string) {
  emit('update:modelValue', id)
  addRecent(id)
  open.value = false
}

function openBrowseDrawer() {
  open.value = false
  drawerOpen.value = true
}

function filterModels(items: string[], term: string): string[] {
  if (!term) return items
  const lower = term.toLowerCase()
  return items.filter(val => {
    if (val === '__browse_more__') return true
    const m = getModel(val)
    if (!m) return val.toLowerCase().includes(lower)
    return (
      m.label.toLowerCase().includes(lower) ||
      m.provider.toLowerCase().includes(lower) ||
      m.id.toLowerCase().includes(lower) ||
      m.badges.some(b => b.toLowerCase().includes(lower))
    )
  })
}
</script>
