// Common type definitions

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Re-export all agent control types
export * from './agentControl'
