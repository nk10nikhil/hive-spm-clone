/**
 * Generate a consistent color from a string (name/email).
 * Uses a simple hash to HSL color conversion.
 */
export function getAvatarColor(name: string): string {
  if (!name) return 'hsl(0, 65%, 45%)'

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 45%)`
}

/**
 * Get initials from first and last name.
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '?'
}

/**
 * Get single initial from a name string.
 */
export function getSingleInitial(name?: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
}

/**
 * Format a Unix timestamp (seconds) to a readable date string.
 */
export function formatTokenDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Mask an API token for display (show only first 8 chars + masked rest).
 */
export function maskToken(token: string): string {
  if (!token || token.length <= 8) return token
  return token.substring(0, 8) + '••••••••••••'
}

/**
 * Validate API token label format (alphanumeric + underscore only).
 */
export function isValidTokenLabel(label: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(label)
}

/**
 * Convert a file to base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate an image file (type and size).
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 2
): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` }
  }

  return { valid: true }
}
