export type RouteType = 'direct' | 'openrouter'

export type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'openrouter'

export type Category = 'flagship' | 'fast' | 'budget' | 'open' | 'experimental'

export type Capability = 'text' | 'vision' | 'tools' | 'reasoning' | 'code' | 'pdf'

export interface ModelEntry {
  id: string
  label: string
  provider: Provider
  routeType: RouteType
  apiModel: string
  category: Category
  badges: string[]
  capabilities: Capability[]
  enabled: boolean
  featured: boolean
  pricingHint?: string
  speedHint?: string
  contextWindow?: number
}
