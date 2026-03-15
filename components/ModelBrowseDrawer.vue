<template>
  <Sheet v-model:open="isOpen">
    <SheetContent side="right" class="w-full sm:w-[480px] p-0 flex flex-col bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85">
      <SheetHeader class="px-6 pt-6 pb-4 border-b border-border/70 bg-background/70 shrink-0">
        <SheetDescription class="sr-only">Search, filter and select AI models</SheetDescription>
        <h2 class="text-lg font-semibold">Browse Models</h2>

        <!-- Search -->
        <div class="relative mt-3">
          <Icon name="lucide:search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="search"
            type="text"
            placeholder="Search models..."
            class="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border/80 bg-background/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <!-- Provider filters -->
        <div class="flex flex-wrap gap-1.5 mt-3">
          <button
            v-for="p in providerFilters"
            :key="p.id"
            @click="toggleProviderFilter(p.id)"
            :class="[
              'inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-background/80 shadow-sm transition-all duration-150',
              activeProviders.has(p.id)
                ? 'bg-primary/12 border-primary/40 text-primary'
                : 'border-border/70 text-foreground/80 hover:bg-accent hover:text-accent-foreground'
            ]"
          >
            <Icon :name="p.icon" class="w-3 h-3" />
            {{ p.label }}
          </button>
        </div>

        <!-- Capability filters -->
        <div class="flex flex-wrap gap-1.5 mt-2">
          <button
            v-for="cap in capabilityFilters"
            :key="cap"
            @click="toggleCapFilter(cap)"
            :class="[
              'px-2.5 py-1 text-xs rounded-full border bg-background/80 shadow-sm transition-all duration-150',
              activeCaps.has(cap)
                ? 'bg-primary/12 border-primary/40 text-primary'
                : 'border-border/70 text-foreground/80 hover:bg-accent hover:text-accent-foreground'
            ]"
          >
            {{ cap }}
          </button>
        </div>
      </SheetHeader>

      <!-- Model list -->
      <ScrollArea class="flex-1 min-h-0">
        <div class="px-4 py-3 space-y-2">
          <p v-if="filteredModels.length === 0" class="text-sm text-muted-foreground text-center py-8">
            No models match your filters.
          </p>

          <button
            v-for="m in filteredModels"
            :key="m.id"
            @click="handleSelect(m.id)"
            :class="[
              'w-full flex items-start gap-3 p-3 rounded-xl text-left border shadow-sm transition-all duration-150',
              m.id === currentModel
                ? 'bg-primary/10 border-primary/35 ring-1 ring-primary/15'
                : 'bg-background/72 border-border/60 hover:bg-accent/70 hover:border-border'
            ]"
          >
            <Icon :name="getProviderIcon(m.provider)" class="w-5 h-5 shrink-0 mt-0.5 text-foreground/70" />

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-medium">{{ m.label }}</span>
                <Badge
                  v-for="badge in m.badges"
                  :key="badge"
                  variant="secondary"
                  class="text-[10px] px-1.5 py-0 h-4 leading-none"
                >
                  {{ badge }}
                </Badge>
                <span
                  v-if="m.routeType === 'openrouter'"
                  class="text-[10px] text-muted-foreground"
                >
                  via OpenRouter
                </span>
              </div>
              <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{{ getProviderLabel(m.provider) }}</span>
                <span v-if="m.contextWindow">{{ formatContext(m.contextWindow) }} ctx</span>
                <span v-if="m.pricingHint">{{ m.pricingHint }}</span>
                <span v-if="m.speedHint" class="capitalize">{{ m.speedHint }}</span>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                @click.stop="toggleFavorite(m.id)"
                class="p-1 rounded-md hover:bg-accent transition-colors"
                :title="isFavorite(m.id) ? 'Remove from favorites' : 'Add to favorites'"
              >
                <Icon
                  :name="isFavorite(m.id) ? 'lucide:star' : 'lucide:star'"
                  class="w-4 h-4"
                  :class="isFavorite(m.id) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'"
                />
              </button>
              <button
                @click.stop="togglePin(m.id)"
                class="p-1 rounded-md hover:bg-accent transition-colors"
                :title="isPinned(m.id) ? 'Unpin' : 'Pin to top'"
              >
                <Icon
                  name="lucide:pin"
                  class="w-4 h-4"
                  :class="isPinned(m.id) ? 'text-primary' : 'text-muted-foreground'"
                />
              </button>
            </div>
          </button>
        </div>
      </ScrollArea>

      <!-- Footer with custom model input -->
      <div class="border-t border-border/70 bg-background/70 px-6 py-4 shrink-0">
        <button
          v-if="!showCustomInput"
          @click="showCustomInput = true"
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Advanced: Use custom model ID...
        </button>
        <div v-else class="space-y-2">
          <label class="text-xs font-medium text-muted-foreground">Custom Model ID</label>
          <div class="flex gap-2">
            <input
              v-model="customId"
              type="text"
              placeholder="e.g. openai/gpt-4o"
              class="flex-1 px-3 py-1.5 text-sm rounded-md border border-border/80 bg-background/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              @click="submitCustomModel"
              :disabled="!customId.trim()"
              class="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Use
            </button>
          </div>
          <p class="text-[11px] text-amber-600 dark:text-amber-400">
            Custom models are routed via OpenRouter. Ensure the model ID is valid.
          </p>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Sheet, SheetContent, SheetHeader, SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { getAllModels, getProviderIcon, getProviderLabel } from '@/lib/models/helpers'
import { PROVIDERS } from '@/lib/models/providers'
import { useModelPreferences } from '@/composables/useModelPreferences'
import type { Provider, Capability } from '@/lib/models/types'

const props = defineProps<{ open: boolean; currentModel: string }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [id: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const { prefs, isFavorite, toggleFavorite, isPinned, togglePin, addCustomModel, makeCustomEntry } = useModelPreferences()

const search = ref('')
const activeProviders = ref(new Set<Provider>())
const activeCaps = ref(new Set<Capability>())
const showCustomInput = ref(false)
const customId = ref('')

const providerFilters = computed(() =>
  Object.entries(PROVIDERS).map(([id, meta]) => ({
    id: id as Provider,
    ...meta,
  }))
)

const capabilityFilters: Capability[] = ['vision', 'reasoning', 'code', 'tools', 'pdf']

function toggleProviderFilter(p: Provider) {
  if (activeProviders.value.has(p)) activeProviders.value.delete(p)
  else activeProviders.value.add(p)
}

function toggleCapFilter(c: Capability) {
  if (activeCaps.value.has(c)) activeCaps.value.delete(c)
  else activeCaps.value.add(c)
}

const filteredModels = computed(() => {
  const registryModels = getAllModels()
  const registryIds = new Set(registryModels.map(m => m.id))
  const customEntries = prefs.customModels
    .filter(id => !registryIds.has(id))
    .map(id => makeCustomEntry(id))
  let models = [...registryModels, ...customEntries]
  const term = search.value.toLowerCase()

  if (term) {
    models = models.filter(m =>
      m.label.toLowerCase().includes(term) ||
      m.provider.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term) ||
      m.badges.some(b => b.toLowerCase().includes(term))
    )
  }

  if (activeProviders.value.size > 0) {
    models = models.filter(m => activeProviders.value.has(m.provider))
  }

  if (activeCaps.value.size > 0) {
    models = models.filter(m =>
      [...activeCaps.value].every(c => m.capabilities.includes(c))
    )
  }

  return models
})

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function handleSelect(id: string) {
  emit('select', id)
  isOpen.value = false
}

function submitCustomModel() {
  const id = customId.value.trim()
  if (!id) return
  addCustomModel(id)
  emit('select', id)
  customId.value = ''
  showCustomInput.value = false
  isOpen.value = false
}
</script>



