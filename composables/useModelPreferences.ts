import { reactive, toRaw, watch } from 'vue'
import type { ModelEntry } from '@/lib/models/types'

const MAX_RECENTS = 5

interface ModelPreferences {
  favorites: string[]
  recents: string[]
  pinned: string[]
  customModels: string[]
  customModelId: string
}

const defaults: ModelPreferences = {
  favorites: [],
  recents: [],
  pinned: [],
  customModels: [],
  customModelId: '',
}

const prefs = reactive<ModelPreferences>({ ...defaults })

if (process.client) {
  try {
    const saved = localStorage.getItem('ghazelle-model-prefs')
    if (saved) {
      Object.assign(prefs, JSON.parse(saved))
    }
  } catch (e) {
    console.warn('Could not parse saved model preferences.', e)
  }

  watch(prefs, (p) => {
    localStorage.setItem('ghazelle-model-prefs', JSON.stringify(toRaw(p)))
  }, { deep: true })
}

export function useModelPreferences() {
  function isFavorite(id: string): boolean {
    return prefs.favorites.includes(id)
  }

  function addFavorite(id: string) {
    if (!prefs.favorites.includes(id)) {
      prefs.favorites.push(id)
    }
  }

  function removeFavorite(id: string) {
    const idx = prefs.favorites.indexOf(id)
    if (idx !== -1) prefs.favorites.splice(idx, 1)
  }

  function toggleFavorite(id: string) {
    if (isFavorite(id)) removeFavorite(id)
    else addFavorite(id)
  }

  function isPinned(id: string): boolean {
    return prefs.pinned.includes(id)
  }

  function togglePin(id: string) {
    const idx = prefs.pinned.indexOf(id)
    if (idx !== -1) prefs.pinned.splice(idx, 1)
    else prefs.pinned.push(id)
  }

  function addRecent(id: string) {
    const idx = prefs.recents.indexOf(id)
    if (idx !== -1) prefs.recents.splice(idx, 1)
    prefs.recents.unshift(id)
    if (prefs.recents.length > MAX_RECENTS) {
      prefs.recents.length = MAX_RECENTS
    }
  }

  function addCustomModel(id: string) {
    if (!prefs.customModels.includes(id)) {
      prefs.customModels.push(id)
    }
  }

  function removeCustomModel(id: string) {
    const idx = prefs.customModels.indexOf(id)
    if (idx !== -1) prefs.customModels.splice(idx, 1)
  }

  function isCustomModel(id: string): boolean {
    return prefs.customModels.includes(id)
  }

  /** Build a synthetic ModelEntry for a custom (non-registry) model ID */
  function makeCustomEntry(id: string): ModelEntry {
    const shortLabel = id.includes('/') ? id.split('/').pop()! : id
    return {
      id,
      label: shortLabel,
      provider: 'openrouter',
      routeType: 'openrouter',
      apiModel: id,
      category: 'experimental',
      badges: ['Custom'],
      capabilities: ['text'],
      enabled: true,
      featured: false,
      pricingHint: undefined,
      speedHint: undefined,
      contextWindow: undefined,
    }
  }

  return {
    prefs,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isPinned,
    togglePin,
    addRecent,
    addCustomModel,
    removeCustomModel,
    isCustomModel,
    makeCustomEntry,
  }
}
