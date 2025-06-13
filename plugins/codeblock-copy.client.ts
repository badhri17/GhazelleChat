import { toast } from 'vue-sonner'

export default defineNuxtPlugin(() => {
  // Add global function for copying code blocks
  if (process.client) {
    (window as any).copyCodeBlock = async (codeId: string) => {
      try {
        // Get the code text from the data attribute
        const codeElement = document.getElementById(codeId)
        const wrapper = codeElement?.closest('.code-block-wrapper') as HTMLElement
        const encodedText = wrapper?.dataset.code
        
        if (!encodedText) {
          throw new Error('Code text not found')
        }
        
        const decodedText = atob(encodedText)
        await navigator.clipboard.writeText(decodedText)
        
        // Show success feedback
        const button = document.querySelector(`#${codeId}`)?.parentElement?.querySelector('.code-copy-btn') as HTMLElement
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          `
          button.style.color = 'hsl(var(--primary))'
          
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.style.color = ''
          }, 2000)
        }
        
        toast.success('Code copied to clipboard', {
          duration: 2000
        })
      } catch (error) {
        console.error('Failed to copy code:', error)
        
        // Fallback: try to select the text manually
        const codeElement = document.getElementById(codeId)
        if (codeElement) {
          try {
            const range = document.createRange()
            range.selectNodeContents(codeElement)
            const selection = window.getSelection()
            if (selection) {
              selection.removeAllRanges()
              selection.addRange(range)
            }
          } catch (fallbackError) {
            console.error('Fallback copy method also failed:', fallbackError)
          }
        }
        
        // Show error feedback
        const button = document.querySelector(`#${codeId}`)?.parentElement?.querySelector('.code-copy-btn') as HTMLElement
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          `
          button.style.color = 'hsl(var(--destructive))'
          
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.style.color = ''
          }, 2000)
        }
        toast.error('Failed to copy code', {
          description: 'Please try again or copy manually.',
          duration: 2000
        })
      }
    }
  }
}) 