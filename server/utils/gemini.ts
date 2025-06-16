import { IncomingAttachment } from '~/server/utils/attachments'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: any
}

export async function buildGeminiMessages (
  chatMessages: ChatMessage[],
  attachments: IncomingAttachment[] | undefined,
  event: any
): Promise<any[]> {
  const googleMessages: any[] = []
  if (chatMessages.length === 0) return googleMessages

  // Merge consecutive messages with same role for token efficiency
  const merged: ChatMessage[] = []
  let current: ChatMessage | null = null
  for (const msg of chatMessages) {
    if (current && current.role === msg.role) {
      current.content += `\n\n${msg.content}`.trim()
    } else {
      if (current) merged.push(current)
      current = { ...msg }
    }
  }
  if (current) merged.push(current)

  const fs = await import('node:fs/promises').then(m => m.default ?? m)
  const path = await import('path').then(m => m.default ?? m)

  for (let i = 0; i < merged.length; i++) {
    const msg = merged[i]
    const parts: any[] = []
    if (msg.content && msg.content.trim() !== '') {
      parts.push({ text: msg.content })
    }

    const isLastUser = i === merged.length - 1 && msg.role === 'user'
    if (isLastUser && attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (!att.mimeType.startsWith('image/')) continue
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
            parts.push({ inlineData: { mimeType: att.mimeType, data: buf.toString('base64') } })
          }
        } catch (e) {
          console.warn('⚠️ Gemini inlineData read failure:', e)
        }
      }
    }

    if (parts.length > 0) {
      googleMessages.push({ role: msg.role === 'user' ? 'user' : 'model', parts })
    }
  }
  return googleMessages
} 