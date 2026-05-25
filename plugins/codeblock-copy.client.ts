import { toast } from 'vue-sonner'

const SUCCESS_ICON = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20,6 9,17 4,12"/>
  </svg>`

const ERROR_ICON = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`

function flashButton(button: HTMLElement, icon: string, color: string) {
  const originalHTML = button.innerHTML
  button.innerHTML = icon
  button.style.color = color
  setTimeout(() => {
    button.innerHTML = originalHTML
    button.style.color = ''
  }, 2000)
}

// Code-copy buttons are rendered as raw HTML inside sanitized markdown, so we
// can't rely on inline handlers (DOMPurify strips them). Instead, delegate
// clicks from the document and read the base64 source from the wrapper.
export default defineNuxtPlugin(() => {
  if (!process.client) return

  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.('.code-copy-btn') as HTMLElement | null
    if (!button) return

    const wrapper = button.closest('.code-block-wrapper') as HTMLElement | null
    const encodedText = wrapper?.dataset.code

    if (!encodedText) {
      flashButton(button, ERROR_ICON, 'hsl(var(--destructive))')
      toast.error('Failed to copy code', { description: 'Code text not found.', duration: 2000 })
      return
    }

    try {
      const decodedText = decodeURIComponent(escape(atob(encodedText)))
      await navigator.clipboard.writeText(decodedText)
      flashButton(button, SUCCESS_ICON, 'hsl(var(--primary))')
      toast.success('Code copied to clipboard', { duration: 2000 })
    } catch (error) {
      console.error('Failed to copy code:', error)
      flashButton(button, ERROR_ICON, 'hsl(var(--destructive))')
      toast.error('Failed to copy code', { description: 'Please try again or copy manually.', duration: 2000 })
    }
  })
})
