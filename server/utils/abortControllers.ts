// Global map to store abort controllers for each message
const abortControllers = new Map<string, AbortController>()

export function setAbortController(messageId: string, controller: AbortController) {
  abortControllers.set(messageId, controller)
  console.log('📝 Stored abort controller for:', messageId)
}

export function abortMessage(messageId: string) {
  const controller = abortControllers.get(messageId)
  if (controller) {
    console.log('🛑 ABORTING REQUEST for:', messageId)
    controller.abort()
    abortControllers.delete(messageId)
    return true
  }
  console.log('❌ No abort controller found for:', messageId)
  return false
} 