import { db } from '~/server/db'
import { attachments } from '~/server/db/schema'
import { nanoid } from 'nanoid'
import { AttachmentMetaInput, validateAttachments } from '~/lib/attachmentRules'

export interface IncomingAttachment {
  id: string // ID returned from the /api/attachments upload endpoint
  fileName: string
  mimeType: string
  size: number
  url: string
}

/**
 * Validate the provided attachments against the chosen model. Returns error string or null.
 */
export function validateIncomingAttachments(model: string, files: IncomingAttachment[]): string | null {
  const meta: AttachmentMetaInput[] = files.map(f => ({ mimeType: f.mimeType, size: f.size }))
  return validateAttachments(model, meta)
}

/**
 * Persist attachments metadata linking them to a message.
 */
export async function linkAttachmentsToMessage(messageId: string, files: IncomingAttachment[]) {
  if (!files.length) return
  const rows = files.map((file) => ({
    id: file.id || nanoid(),
    messageId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    url: file.url,
    createdAt: new Date(),
  }))
  await db.insert(attachments).values(rows)
}

/**
 * Helper to transform attachments into vendor-specific message payload.
 * Currently only supports OpenAI & Anthropic image_url format.
 */
export function buildVendorAttachmentParts(model: string, files: IncomingAttachment[], baseUrl: string = '') {
  // Only image attachments are currently supported.
  const imageFiles = files.filter(f => f.mimeType.startsWith('image/'))
  if (imageFiles.length === 0) return []

  if (model.startsWith('gpt-')) {
    // This is handled by the dedicated OpenAI message-building logic in chat.post.ts,
    // which correctly combines text and base64-inlined images into a single message.
    return []
  }

  if (model.startsWith('claude-')) {
    // Anthropic vision expects images as separate user block with source URL.
    return imageFiles.map((file) => ({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'url',
            url: file.url.startsWith('/') ? `${baseUrl}${file.url}` : file.url,
          },
        },
      ],
    }))
  }
  if (model.startsWith('gemini-')) {
    // Gemini handles images via inline_data (base64) injected later in chat.post, so skip here.
    return []
  }
  return []
} 