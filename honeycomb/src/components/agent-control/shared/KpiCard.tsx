import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; direction: 'up' | 'down' }
  highlight?: boolean
  loading?: boolean
  className?: string
}

/**
 * Real-time KPI display card with optional trend indicator.
 */
export function KpiCard({
  label,
  value,
  icon,
  trend,
  highlight,
  loading,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <CardContent className="p-0">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        highlight && 'border-primary bg-primary/5',
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{value}</span>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
