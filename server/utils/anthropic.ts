import { IncomingAttachment } from '~/server/utils/attachments'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: any
}

/**
 * Build Anthropic‐compatible messages array, injecting image blocks.
 * – If attachment URL is HTTPS ⇒ pass as {type:"url"}
 * – Otherwise inline as base64.
 * Empty content messages are automatically stripped.
 */
export async function buildAnthropicMessages (
  chatMessages: ChatMessage[],
  attachments: IncomingAttachment[] | undefined,
  event: any
): Promise<any[]> {
  let messages = chatMessages
  if (attachments && attachments.length > 0) {
    const protocol = (event.node.req.headers['x-forwarded-proto'] as string) || 'http'
    const host = event.node.req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const fs = await import('node:fs/promises').then(m => m.default ?? m)
    const path = await import('path').then(m => m.default ?? m)

    messages = await Promise.all(chatMessages.map(async (msg, idx) => {
      if (idx === chatMessages.length - 1 && msg.role === 'user') {
        const parts: any[] = []
        if (msg.content) parts.push({ type: 'text', text: msg.content })

        for (const att of attachments) {
          const isImage = att.mimeType.startsWith('image/')
          const isPdf = att.mimeType === 'application/pdf'
          if (!isImage && !isPdf) continue

          let part: any = null
          const externalUrl = att.url.startsWith('http') ? att.url : `${baseUrl}${att.url}`
          if (externalUrl.startsWith('https://')) {
            if (isImage) {
              part = { type: 'image', source: { type: 'url', url: externalUrl } }
            } else if (isPdf) {
              part = { type: 'document', source: { type: 'url', url: externalUrl } }
            }
          } else {
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
                if (isImage) {
                  part = {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: att.mimeType,
                      data: buf.toString('base64')
                    }
                  }
                } else if (isPdf) {
                  part = {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: att.mimeType,
                      data: buf.toString('base64')
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('⚠️ Failed to inline image for Anthropic, skipping', e)
            }
          }
          if (part) parts.push(part)
        }
        return { role: 'user', content: parts }
      }
      return msg
    }))
  }

  // Strip empty‐content messages
  return messages.filter(m => {
    const c: any = (m as any).content
    if (typeof c === 'string') return c.trim().length > 0
    if (Array.isArray(c)) return c.length > 0
    return true
  })
} 