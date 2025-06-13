// Shared registry to track aborted message IDs
const abortedMessages = new Set<string>()

export function markMessageAsAborted(messageId: string) {
  abortedMessages.add(messageId)
  console.log('🛑 Marked message as aborted:', messageId)
}

export function isMessageAborted(messageId: string): boolean {
  return abortedMessages.has(messageId)
}

export function removeFromAbortRegistry(messageId: string) {
  abortedMessages.delete(messageId)
  console.log('🗑️ Removed message from abort registry:', messageId)
}

export function getAbortedMessages(): string[] {
  return Array.from(abortedMessages)
} 