/**
 * Extract all code blocks from markdown content.
 * Returns array of code content without the fence markers.
 */
export function extractCodeBlocks(markdown: string): string[] {
  if (!markdown) return []

  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g
  const matches: string[] = []
  let match

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    matches.push(match[1].trimEnd())
  }

  return matches
}

/**
 * Copy text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

/**
 * Download content as a file.
 */
export function downloadAsFile(
  content: string,
  filename: string,
  mimeType = 'text/markdown'
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
