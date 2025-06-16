import { IncomingAttachment } from '~/server/utils/attachments'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: any
}

/**
 * Construct OpenAI chat.messages array, inlining images for Vision models.
 * Works for both text-only and multimodal GPT-4o.
 */
export async function buildOpenAIMessages (
  chatMessages: ChatMessage[],
  attachments: IncomingAttachment[] | undefined,
  event: any
): Promise<any[]> {
  if (!attachments || attachments.length === 0) return chatMessages

  const protocol = (event.node.req.headers['x-forwarded-proto'] as string) || 'http'
  const host = event.node.req.headers.host || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  const fs = await import('node:fs/promises').then(m => m.default ?? m)
  const path = await import('path').then(m => m.default ?? m)

  return Promise.all(chatMessages.map(async (msg, idx) => {
    // Only augment the last user message
    if (idx === chatMessages.length - 1 && msg.role === 'user') {
      const parts: any[] = []
      if (msg.content) parts.push({ type: 'text', text: msg.content })

      for (const att of attachments) {
        if (!att.mimeType.startsWith('image/')) continue

        let dataUrl: string | null = null
        try {
          const filePath = (() => {
            if ((att as any).relativeUrl?.startsWith('/')) return path.join(process.cwd(), 'public', (att as any).relativeUrl.slice(1))
            if (att.url.startsWith('/')) return path.join(process.cwd(), 'public', att.url.slice(1))
            try {
              const pathname = new URL(att.url).pathname
              return path.join(process.cwd(), 'public', pathname.startsWith('/') ? pathname.slice(1) : pathname)
            } catch { return '' }
          })()
          if (filePath) {
            const buf = await fs.readFile(filePath)
            dataUrl = `data:${att.mimeType};base64,${buf.toString('base64')}`
          }
        } catch (e) {
          console.warn('⚠️ Failed to inline image for OpenAI', e)
        }

        const imagePayloadUrl = dataUrl || (att.url.startsWith('/') ? `${baseUrl}${att.url}` : att.url)
        parts.push({ type: 'image_url', image_url: { url: imagePayloadUrl } })
      }
      return { role: 'user', content: parts }
    }
    return msg
  }))
} 