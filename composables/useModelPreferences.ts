import { reactive, toRaw, watch } from 'vue'

const MAX_RECENTS = 5

interface ModelPreferences {
  favorites: string[]
  recents: string[]
  pinned: string[]
  customModelId: string
}

const defaults: ModelPreferences = {
  favorites: [],
  recents: [],
  pinned: [],
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

  return {
    prefs,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isPinned,
    togglePin,
    addRecent,
  }
}
