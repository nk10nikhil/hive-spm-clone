import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Bot,
  User,
  LayoutGrid,
  Tag,
  Ban,
  Gauge,
  ArrowDown,
  Bell,
  Mail,
  Webhook,
  ChevronRight,
} from 'lucide-react'
import type { BudgetConfig, BudgetType, LimitAction } from '@/types/agentControl'

interface BudgetCardProps {
  budget: BudgetConfig
  onClick?: () => void
  className?: string
}

const typeIcons: Record<BudgetType, React.ElementType> = {
  global: DollarSign,
  agent: Bot,
  customer: User,
  feature: LayoutGrid,
  tag: Tag,
}

const typeColors: Record<BudgetType, string> = {
  global: 'bg-blue-100 text-blue-700',
  agent: 'bg-red-100 text-red-700',
  customer: 'bg-purple-100 text-purple-700',
  feature: 'bg-orange-100 text-orange-700',
  tag: 'bg-green-100 text-green-700',
}

const actionIcons: Record<LimitAction, React.ElementType> = {
  kill: Ban,
  throttle: Gauge,
  degrade: ArrowDown,
  notify: Bell,
}

const actionColors: Record<LimitAction, string> = {
  kill: 'bg-red-100 text-red-700',
  throttle: 'bg-orange-100 text-orange-700',
  degrade: 'bg-blue-100 text-blue-700',
  notify: 'bg-green-100 text-green-700',
}

const actionLabels: Record<LimitAction, string> = {
  kill: 'Block',
  throttle: 'Throttle',
  degrade: 'Degrade',
  notify: 'Notify',
}

/**
 * Budget row with horizontal layout matching launchpad style.
 */
export function BudgetCard({ budget, onClick, className }: BudgetCardProps) {
  const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0
  const status = percentage >= 100 ? 'critical' : percentage >= 80 ? 'warning' : 'healthy'

  const TypeIcon = typeIcons[budget.type] || DollarSign
  const ActionIcon = actionIcons[budget.limitAction] || Gauge

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div
      className={cn(
        'bg-card border rounded-lg px-5 py-4 cursor-pointer transition-all',
        'hover:border-primary hover:shadow-md hover:-translate-y-0.5',
        status === 'critical' && 'border-red-200',
        status === 'warning' && 'border-yellow-200',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-6">
        {/* Left: Icon + Name + Badges */}
        <div className="flex items-center gap-3 flex-shrink-0 w-[280px] min-w-[120px]">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">{budget.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className={cn('text-xs capitalize', typeColors[budget.type])}>
                {budget.type}
              </Badge>
              {budget.tagCategory && (
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                  {budget.tagCategory}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">
              {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs font-semibold',
                status === 'healthy' && 'bg-green-100 text-green-700',
                status === 'warning' && 'bg-orange-100 text-orange-700',
                status === 'critical' && 'bg-red-100 text-red-700'
              )}
            >
              {Math.round(percentage)}%
            </Badge>
          </div>
          <Progress
            value={Math.min(percentage, 100)}
            className={cn(
              'h-2',
              status === 'healthy' && '[&>div]:bg-green-500',
              status === 'warning' && '[&>div]:bg-orange-500',
              status === 'critical' && '[&>div]:bg-red-500'
            )}
          />
        </div>

        {/* Right: Actions + Notifications + Chevron */}
        <div className="flex items-center gap-3 flex-shrink-0 w-[200px] justify-end">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 px-3 py-1.5',
              actionColors[budget.limitAction]
            )}
          >
            <ActionIcon className="h-3.5 w-3.5" />
            {actionLabels[budget.limitAction]}
          </Badge>

          <div className="flex items-center gap-2 w-[72px] justify-end">
            {budget.notifications.inApp && (
              <Bell className="h-4 w-4 text-primary" />
            )}
            {budget.notifications.email && (
              <Mail className="h-4 w-4 text-primary" />
            )}
            {budget.notifications.webhook && (
              <Webhook className="h-4 w-4 text-primary" />
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  )
}
