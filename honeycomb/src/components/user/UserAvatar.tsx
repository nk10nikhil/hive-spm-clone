import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  getAvatarColor,
  getSingleInitial,
  fileToBase64,
  validateImageFile,
} from '@/lib/user'

interface UserAvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showUpload?: boolean
  onUpload?: (base64: string) => void
  className?: string
  isLoading?: boolean
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

export function UserAvatar({
  src,
  name = '',
  size = 'md',
  showUpload = false,
  onUpload,
  className,
  isLoading = false,
}: UserAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const initial = getSingleInitial(name)
  const bgColor = getAvatarColor(name)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    const validation = validateImageFile(file, 2)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      onUpload?.(base64)
    } catch {
      setError('Failed to process image')
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (showUpload && !isLoading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar
        className={cn(
          sizeClasses[size],
          showUpload && !isLoading && 'cursor-pointer',
          'ring-2 ring-offset-2',
          className
        )}
        style={{ '--ring-color': bgColor } as React.CSSProperties}
        onClick={handleClick}
      >
        {src && !isLoading ? (
          <AvatarImage src={src} alt={name} className="object-cover" />
        ) : null}
        <AvatarFallback
          style={{ backgroundColor: bgColor }}
          className="text-white font-medium"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            initial
          )}
        </AvatarFallback>
      </Avatar>

      {showUpload && !isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/50 rounded-full opacity-0 hover:opacity-100',
            'transition-opacity cursor-pointer'
          )}
          onClick={handleClick}
        >
          <Upload className="h-4 w-4 text-white" />
        </div>
      )}

      {showUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {error && (
        <p className="absolute -bottom-6 left-0 right-0 text-center text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
