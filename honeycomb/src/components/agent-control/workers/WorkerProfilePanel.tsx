import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { AgentInfo } from '@/types/agentControl'

interface WorkerProfilePanelProps {
  worker: AgentInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Sidebar sheet showing detailed worker/agent information.
 */
export function WorkerProfilePanel({
  worker,
  open,
  onOpenChange,
}: WorkerProfilePanelProps) {
  if (!worker) return null

  const isOnline = worker.status === 'connected'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)

  const stats = [
    {
      label: 'Total Requests',
      value: worker.total_requests.toLocaleString(),
    },
    {
      label: 'Total Cost',
      value: formatCurrency(worker.total_cost),
    },
    {
      label: 'First Seen',
      value: formatDate(worker.first_seen),
    },
    {
      label: 'Last Seen',
      value: formatDate(worker.last_seen),
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {(worker.agent_name || worker.agent).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-left">
                {worker.agent_name || worker.agent}
              </SheetTitle>
              <SheetDescription className="text-left">
                {worker.agent}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant="secondary"
              className={cn(
                isOnline
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              )}
            >
              <span
                className={cn(
                  'mr-1.5 h-2 w-2 rounded-full',
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
              />
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Connection Type */}
          {worker.connection_type && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection</span>
              <Badge variant="outline">{worker.connection_type}</Badge>
            </div>
          )}

          {/* Instance ID */}
          {worker.instance_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Instance ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {worker.instance_id.slice(0, 8)}...
              </code>
            </div>
          )}

          <Separator />

          {/* Stats */}
          <div className="space-y-4">
            <h4 className="font-medium">Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="font-medium">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Activity Timeline (placeholder) */}
          <div className="space-y-4">
            <h4 className="font-medium">Recent Activity</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div>
                  <div className="text-sm">Connected</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(worker.last_seen)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <div className="text-sm">First request</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(worker.first_seen)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
