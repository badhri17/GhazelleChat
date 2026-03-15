import type { Provider, RouteType } from '~/lib/models/types'
import { MODEL_REGISTRY } from '~/lib/models/registry'

const modelMap = new Map(MODEL_REGISTRY.map(m => [m.id, m]))

export interface ResolvedProvider {
  provider: Provider
  routeType: RouteType
  apiModel: string
}

/**
 * Resolves a model ID to its provider and routing information.
 * Known registry models get their exact provider; unknown IDs
 * fall back to OpenRouter routing.
 */
export function resolveProvider(modelId: string): ResolvedProvider {
  const entry = modelMap.get(modelId)

  if (entry) {
    return {
      provider: entry.provider,
      routeType: entry.routeType,
      apiModel: entry.apiModel,
    }
  }

  return {
    provider: 'openrouter',
    routeType: 'openrouter',
    apiModel: modelId,
  }
}

export function isKnownModel(modelId: string): boolean {
  return modelMap.has(modelId)
}

export function getEnabledModelIds(): string[] {
  return MODEL_REGISTRY.filter(m => m.enabled).map(m => m.id)
}
