import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { LiveIndicator } from './shared/LiveIndicator'
import { useLogs } from '@/hooks/queries/useLogs'
import { useAgentControlStore } from '@/stores/agentControlStore'
import { cn } from '@/lib/utils'

type ViewMode = 'metrics' | 'requests'

const dataTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'llm_request', label: 'LLM Requests' },
  { value: 'tool_call', label: 'Tool Calls' },
  { value: 'error', label: 'Errors' },
]

// Define log entry type
interface LogEntry {
  id?: string
  timestamp: string
  type?: string
  agent?: string
  model?: string
  success?: boolean
  cost?: number
  latency?: number
  [key: string]: unknown
}

/**
 * Logs viewer with filtering and export capabilities.
 */
export function DataPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('requests')
  const [dataType, setDataType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const hasActiveAgents = useAgentControlStore((state) => state.eventsBuffer.length > 0)

  // Get date range (last 24 hours)
  const endDate = useMemo(() => new Date().toISOString(), [])
  const startDate = useMemo(() => {
    const d = new Date()
    d.setHours(d.getHours() - 24)
    return d.toISOString()
  }, [])

  const { data: logsData, isLoading, error, refetch } = useLogs(startDate, endDate, 500)

  // Parse logs from API response
  const logs = useMemo((): LogEntry[] => {
    if (!logsData) return []
    // Handle different response shapes
    const rawLogs = (logsData as { rows?: unknown[] }).rows ||
                    (logsData as { logs?: unknown[] }).logs ||
                    (Array.isArray(logsData) ? logsData : [])
    return (rawLogs as LogEntry[]).map((log, idx) => ({
      ...log,
      id: log.id || `log-${idx}`,
    }))
  }, [logsData])

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (dataType !== 'all' && log.type !== dataType) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchable = JSON.stringify(log).toLowerCase()
        return searchable.includes(query)
      }
      return true
    })
  }, [logs, dataType, searchQuery])

  const handleExport = () => {
    if (!filteredLogs.length) return

    const csv = [
      ['Timestamp', 'Type', 'Agent', 'Model', 'Status', 'Cost', 'Latency'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.type || '-',
          log.agent || '-',
          log.model || '-',
          log.success !== undefined ? (log.success ? 'Success' : 'Failed') : '-',
          log.cost?.toFixed(4) || '-',
          log.latency ? `${log.latency}ms` : '-',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">Failed to load logs</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pr-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'requests' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('requests')}
            >
              Requests
            </Button>
            <Button
              variant={viewMode === 'metrics' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('metrics')}
            >
              Metrics
            </Button>
          </div>

          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Data type" />
            </SelectTrigger>
            <SelectContent>
              {dataTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <LiveIndicator isLive={hasActiveAgents} />
          <Button variant="outline" onClick={handleExport} disabled={!filteredLogs.length}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {viewMode === 'requests' ? 'Request Logs' : 'Metrics Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No logs found
            </div>
          ) : viewMode === 'requests' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedRow(expandedRow === log.id ? null : log.id || null)
                      }
                    >
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.type || 'request'}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[150px]">
                        {log.agent || '-'}
                      </TableCell>
                      <TableCell className="truncate max-w-[150px]">
                        {log.model || '-'}
                      </TableCell>
                      <TableCell>
                        {log.success !== undefined ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              log.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            )}
                          >
                            {log.success ? 'Success' : 'Failed'}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.cost ? `$${log.cost.toFixed(4)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.latency ? `${log.latency}ms` : '-'}
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <pre className="text-xs p-4 overflow-auto max-h-[300px]">
                            {JSON.stringify(log, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            // Metrics view - simplified
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Requests</TableCell>
                  <TableCell>{filteredLogs.length}</TableCell>
                  <TableCell>Last 24h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Success Rate</TableCell>
                  <TableCell>
                    {(
                      (filteredLogs.filter((l) => l.success !== false).length /
                        Math.max(filteredLogs.length, 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell>Last 24h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Cost</TableCell>
                  <TableCell>
                    $
                    {filteredLogs
                      .reduce((sum, l) => sum + (l.cost || 0), 0)
                      .toFixed(2)}
                  </TableCell>
                  <TableCell>Last 24h</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
