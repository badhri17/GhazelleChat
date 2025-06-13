// Simple shared abort map
const abortedMessages = new Map<string, boolean>()

export function setAbort(messageId: string) {
  abortedMessages.set(messageId, true)
  console.log('🛑 SET ABORT FLAG for:', messageId)
}

export function checkAbort(messageId: string): boolean {
  return abortedMessages.get(messageId) || false
}

export function clearAbort(messageId: string) {
  abortedMessages.delete(messageId)
  console.log('🗑️ CLEARED ABORT FLAG for:', messageId)
} 