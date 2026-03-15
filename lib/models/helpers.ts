import type { ModelEntry, Provider, Category, Capability } from './types'
import { MODEL_REGISTRY } from './registry'
import { PROVIDERS } from './providers'

const modelMap = new Map<string, ModelEntry>(
  MODEL_REGISTRY.map(m => [m.id, m])
)

export function getModel(id: string): ModelEntry | undefined {
  return modelMap.get(id)
}

export function getAllModels(): ModelEntry[] {
  return MODEL_REGISTRY
}

export function getEnabledModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.enabled)
}

export function getFeaturedModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.enabled && m.featured)
}

export function getModelsByCategory(category: Category): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.enabled && m.category === category)
}

export function getModelsByProvider(provider: Provider): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.enabled && m.provider === provider)
}

export function getModelsByCapability(capability: Capability): ModelEntry[] {
  return MODEL_REGISTRY.filter(m => m.enabled && m.capabilities.includes(capability))
}

export function getValidModelIds(): string[] {
  return MODEL_REGISTRY.filter(m => m.enabled).map(m => m.id)
}

export function isValidModelId(id: string): boolean {
  const entry = modelMap.get(id)
  return !!entry && entry.enabled
}

export function isKnownModelId(id: string): boolean {
  return modelMap.has(id)
}

export function getProviderIcon(provider: Provider): string {
  return PROVIDERS[provider]?.icon ?? 'lucide:cpu'
}

export function getProviderLabel(provider: Provider): string {
  return PROVIDERS[provider]?.label ?? provider
}

export function getModelLabel(id: string): string {
  return getModel(id)?.label ?? id
}

/** Group enabled models by a UI-friendly display order */
export function getGroupedModels(): { label: string; models: ModelEntry[] }[] {
  const enabled = getEnabledModels()
  const groups: { label: string; filter: (m: ModelEntry) => boolean }[] = [
    { label: 'Best Models',  filter: m => m.featured && (m.category === 'flagship') },
    { label: 'Fast Models',  filter: m => m.category === 'fast' || m.speedHint === 'fast' },
    { label: 'Open Models',  filter: m => m.category === 'open' },
    { label: 'Budget Models', filter: m => m.category === 'budget' },
    { label: 'Experimental', filter: m => m.category === 'experimental' },
  ]

  const used = new Set<string>()
  const result: { label: string; models: ModelEntry[] }[] = []

  for (const g of groups) {
    const models = enabled.filter(m => !used.has(m.id) && g.filter(m))
    if (models.length > 0) {
      models.forEach(m => used.add(m.id))
      result.push({ label: g.label, models })
    }
  }

  // Catch any remaining enabled models not in a group
  const remaining = enabled.filter(m => !used.has(m.id))
  if (remaining.length > 0) {
    result.push({ label: 'Other Models', models: remaining })
  }

  return result
}
