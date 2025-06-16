// Attachment rules and helper utilities shared between server & client

export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf'

interface ModelPolicy {
  allowedMimeTypes: SupportedMime[]
  maxFileSizeMB: number // Max size per file
  maxFiles?: number // Optionally cap number of attachments
}

// Mapping model ➜ policy (extend as needed)
export const ATTACHMENT_POLICIES: Record<string, ModelPolicy> = {
  // OpenAI
  'gpt-4o': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 10,
  },
  'gpt-4o-mini': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 5,
  },
  // Anthropic Claude 3+ (vision-enabled)
  'claude-3-5-sonnet-latest': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 10,
  },
  'claude-sonnet-4-20250514': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 10,
  },
  'claude-opus-4-20250514': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 20,
  },
  // Gemini vision models
  'gemini-pro': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 10,
  },
  'gemini-2.5-pro': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 10,
  },
  'gemini-2.0-flash': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 5,
  },
  'gemini-2.0-flash-lite': {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSizeMB: 5,
  },
  // Llama & other text-only models – no attachments allowed
  'llama-3.1-70b-versatile': {
    allowedMimeTypes: [],
    maxFileSizeMB: 0,
  },
}

export function getPolicyForModel(model: string): ModelPolicy {
  return ATTACHMENT_POLICIES[model] || { allowedMimeTypes: [], maxFileSizeMB: 0 }
}

export interface AttachmentMetaInput {
  mimeType: string
  size: number // bytes
}

export function validateAttachment(model: string, attachment: AttachmentMetaInput): string | null {
  const policy = getPolicyForModel(model)

  if (!policy.allowedMimeTypes.includes(attachment.mimeType as SupportedMime)) {
    return `Attachments of type ${(attachment.mimeType)} are not supported by ${model}.`
  }

  const maxBytes = policy.maxFileSizeMB * 1024 * 1024
  if (attachment.size > maxBytes) {
    return `File exceeds size limit of ${policy.maxFileSizeMB} MB for model ${model}.`
  }
  return null
}

export function validateAttachments(model: string, attachments: AttachmentMetaInput[]): string | null {
  for (const att of attachments) {
    const err = validateAttachment(model, att)
    if (err) return err
  }
  return null
} 