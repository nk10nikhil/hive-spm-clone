import { cn } from '@/lib/utils'

interface LiveIndicatorProps {
  isLive?: boolean
  className?: string
}

/**
 * Pulsing dot indicator for live/active status.
 */
export function LiveIndicator({ isLive = true, className }: LiveIndicatorProps) {
  if (!isLive) return null

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="text-xs text-muted-foreground">Live</span>
    </div>
  )
}
