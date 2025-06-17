import { reactive, toRaw, watch } from 'vue'

const defaultSettings = {
  theme: 'light',
  language: 'en',
  systemPrompt: '',
  showFollowUp: true,
  showCodeAnalyst: true,
}

const settings = reactive({ ...defaultSettings })

if (process.client) {
  try {
    const saved = localStorage.getItem('ghazelle-settings')
    if (saved) {
      Object.assign(settings, JSON.parse(saved))
    }
  } catch (e) {
    console.warn('Could not parse saved settings.', e)
  }

  // 2. Set up a single watcher to persist any future changes to the settings object.
  watch(settings, (newSettings) => {
    localStorage.setItem('ghazelle-settings', JSON.stringify(toRaw(newSettings)))
  }, { deep: true })
}

/**
 * Provides a global, persistent, and reactive settings object.
 * The state is a singleton, loaded from localStorage once, and automatically saved on change.
 */
export function useSettings() {
  // Simply return the singleton state.
  return {
    settings,
  }
} 