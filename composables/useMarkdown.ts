import { marked } from 'marked'
import hljs from 'highlight.js'

export const useMarkdown = () => {
  // Configure marked with highlight.js  
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  })
  
  const renderer = new marked.Renderer()
  renderer.code = function({ text, lang }: { text: string; lang?: string }) {
    const codeId = `code-${Math.random().toString(36).substr(2, 9)}`
    
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(text, { language: lang }).value
        return `
          <div class="code-block-wrapper" data-code="${btoa(text)}">
            <pre><code class="hljs language-${lang}" id="${codeId}">${highlighted}</code></pre>
            <button 
              class="code-copy-btn" 
              onclick="copyCodeBlock('${codeId}')"
              title="Copy code"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
          </div>`
      } catch (err) {
        console.warn('Syntax highlighting failed:', err)
      }
    }
    const autoHighlighted = hljs.highlightAuto(text)
    return `
      <div class="code-block-wrapper" data-code="${btoa(text)}">
        <pre><code class="hljs" id="${codeId}">${autoHighlighted.value}</code></pre>
        <button 
          class="code-copy-btn" 
          onclick="copyCodeBlock('${codeId}')"
          title="Copy code"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
      </div>`
  }
  
  // Custom renderer for inline code (`code`)
  renderer.codespan = function({ text }: { text: string }) {
    // Escape HTML entities inside inline code
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<code class="inline-code p-1 rounded bg-muted/70 dark:bg-muted/80 font-mono ">${escaped}</code>`
  }
  
  marked.use({ renderer })

  const parseMarkdown = (content: string): string => {
    try {
      return marked(content) as string
    } catch (error) {
      console.error('Markdown parsing failed:', error)
      // Fallback to escaped HTML if parsing fails
      return content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }

  return {
    parseMarkdown
  }
} 