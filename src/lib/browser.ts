import { invoke } from '@tauri-apps/api/core'

/**
 * Uses DuckDuckGo HTML version to do a web search.
 * Returns a formatted Markdown string of the top results.
 */
export async function searchWeb(query: string): Promise<string> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const html = await invoke<string>('fetch_url', { url })
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const results = doc.querySelectorAll('.result')
    if (results.length === 0) {
      if (html.includes('Captcha')) {
        return 'No results found. Search engine triggered a Captcha blocking automated requests.'
      }
      return `No search results found. Here is the raw HTML snippet:\n\n${html.substring(0, 300)}`
    }

    let output = `## Search Results for "${query}"\n\n`
    let count = 0

    for (const result of results) {
      if (count >= 5) break

      const titleEl = result.querySelector('.result__title a') as HTMLAnchorElement
      const snippetEl = result.querySelector('.result__snippet') as HTMLElement
      const urlEl = result.querySelector('.result__url') as HTMLAnchorElement

      if (titleEl && urlEl) {
        const title = titleEl.textContent?.trim() || 'No Title'
        const link = urlEl.href?.trim() || ('https://' + urlEl.textContent?.trim())
        const snippet = snippetEl ? snippetEl.textContent?.trim() : 'No description'

        output += `### [${title}](${link})\n> ${snippet}\n\n`
        count++
      }
    }

    return output
  } catch (error) {
    return `Error searching the web: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * Fetches a webpage and intelligently extracts the main body text, 
 * stripping out nav bars, scripts, styles, etc.
 */
export async function readWebpage(url: string): Promise<string> {
  try {
    const html = await invoke<string>('fetch_url', { url })
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove noise elements
    const selectorsToRemove = [
      'script', 'style', 'noscript', 'iframe', 'nav', 'footer', 
      'header', 'aside', 'form', '[role="banner"]', '[role="navigation"]',
      'svg', 'canvas', 'button'
    ]
    
    selectorsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove())
    })

    // Try to find the main content container, fall back to body
    const mainNode: HTMLElement | null = 
      doc.querySelector('article') || 
      doc.querySelector('main') || 
      doc.querySelector('[role="main"]') || 
      doc.querySelector('.main-content') || 
      doc.querySelector('#main') ||
      doc.body

    if (!mainNode) {
      return "Could not extract content from the webpage."
    }

    // Convert DOM tree into a simple text summary with basic structure
    let content = ''
    
    function extractText(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) content += text + ' '
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tag = el.tagName.toLowerCase()
        
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          content += '\n\n# ' + (el.textContent?.trim() || '') + '\n'
        } else if (tag === 'p') {
          content += '\n\n'
          node.childNodes.forEach(extractText)
          content += '\n\n'
        } else if (tag === 'a') {
          const href = (el as HTMLAnchorElement).href
          if (href && href.startsWith('http')) {
            content += ' ' + (el.textContent?.trim() || '') + ` (${href}) `
          } else {
            content += ' ' + (el.textContent?.trim() || '') + ' '
          }
        } else if (tag === 'li') {
          content += '\n- '
          node.childNodes.forEach(extractText)
        } else if (tag === 'pre' || tag === 'code') {
          content += '\n```\n' + (el.textContent?.trim() || '') + '\n```\n'
        } else {
          node.childNodes.forEach(extractText)
        }
      }
    }

    extractText(mainNode)

    // Clean up excessive whitespace and newlines
    let finalContent = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim()

    // 3000 characters is roughly 800 tokens. This completely solves Groq's 6000 TPM limit.
    if (finalContent.length > 3000) {
      finalContent = finalContent.substring(0, 3000) + '\n\n[Content truncated to save memory limit]'
    }

    return `## Reading: ${doc.title || url}\n\n${finalContent}`
  } catch (error) {
    return `Error reading webpage: ${error instanceof Error ? error.message : String(error)}`
  }
}
