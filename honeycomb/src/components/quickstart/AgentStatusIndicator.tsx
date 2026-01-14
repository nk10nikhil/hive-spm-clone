import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAgentStatus } from '@/hooks/useAgentStatus'

interface AgentStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function AgentStatusIndicator({
  className,
  showDetails = true,
}: AgentStatusIndicatorProps) {
  const { status, isConnected, error, hasActiveAgents, agentCount } =
    useAgentStatus({ autoConnect: true, autoReconnect: true })

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const tooltipContent = () => {
    if (error) {
      return <span className="text-red-400">{error}</span>
    }

    if (!isConnected) {
      return <span className="text-muted-foreground">Connecting...</span>
    }

    if (!hasActiveAgents) {
      return <span className="text-muted-foreground">No agents connected</span>
    }

    if (showDetails && status?.instances?.length) {
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {agentCount} agent{agentCount !== 1 ? 's' : ''} connected
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {status.instances.slice(0, 5).map((instance) => (
              <div key={instance.instance_id}>
                {instance.instance_id.slice(0, 8)}... -{' '}
                {formatTime(instance.connected_at)}
              </div>
            ))}
            {status.instances.length > 5 && (
              <div>+{status.instances.length - 5} more</div>
            )}
          </div>
        </div>
      )
    }

    return `${agentCount} agent${agentCount !== 1 ? 's' : ''} connected`
  }

  const indicator = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2">
        {hasActiveAgents ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </>
        ) : (
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-400" />
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {hasActiveAgents ? `${agentCount} connected` : 'No agents'}
      </span>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
