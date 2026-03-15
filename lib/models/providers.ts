import type { Provider } from './types'

export interface ProviderMeta {
  label: string
  icon: string
}

export const PROVIDERS: Record<Provider, ProviderMeta> = {
  openai:     { label: 'OpenAI',    icon: 'simple-icons:openai' },
  anthropic:  { label: 'Anthropic', icon: 'simple-icons:anthropic' },
  google:     { label: 'Google',    icon: 'simple-icons:google' },
  groq:       { label: 'Groq',      icon: 'simple-icons:ollama' },
  openrouter: { label: 'OpenRouter', icon: 'lucide:globe' },
}
