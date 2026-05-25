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
 * Only models present in the registry are accepted; unknown IDs are
 * rejected with a 400 so arbitrary strings can't be billed to OpenRouter.
 * To use a custom OpenRouter model, add it to lib/models/registry.ts.
 */
export function resolveProvider(modelId: string): ResolvedProvider {
  const entry = modelMap.get(modelId)

  if (!entry) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown model ID' })
  }

  return {
    provider: entry.provider,
    routeType: entry.routeType,
    apiModel: entry.apiModel,
  }
}

export function isKnownModel(modelId: string): boolean {
  return modelMap.has(modelId)
}

export function getEnabledModelIds(): string[] {
  return MODEL_REGISTRY.filter(m => m.enabled).map(m => m.id)
}
