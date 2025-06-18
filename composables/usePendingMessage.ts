interface PendingAttachment {
  id: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

interface PendingMessage {
  message: string
  attachments: PendingAttachment[]
}

// Global reactive state for pending message
const pendingMessage = ref<PendingMessage | null>(null)

export const usePendingMessage = () => {
  const setPendingMessage = (message: string, attachments: PendingAttachment[] = []) => {
    pendingMessage.value = {
      message,
      attachments
    }
  }

  const getPendingMessage = () => {
    const pending = pendingMessage.value
    // Clear after getting to ensure it's only used once
    pendingMessage.value = null
    return pending
  }

  const clearPendingMessage = () => {
    pendingMessage.value = null
  }

  const hasPendingMessage = computed(() => !!pendingMessage.value)

  return {
    setPendingMessage,
    getPendingMessage,
    clearPendingMessage,
    hasPendingMessage
  }
} 