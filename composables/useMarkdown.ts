import { marked } from 'marked'
import hljs from 'highlight.js'

export const useMarkdown = () => {
  // Configure marked with highlight.js  
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  })
  
  // Set up renderer with syntax highlighting
  const renderer = new marked.Renderer()
  renderer.code = function({ text, lang }: { text: string; lang?: string }) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(text, { language: lang }).value
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
      } catch (err) {
        console.warn('Syntax highlighting failed:', err)
      }
    }
    const autoHighlighted = hljs.highlightAuto(text)
    return `<pre><code class="hljs">${autoHighlighted.value}</code></pre>`
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