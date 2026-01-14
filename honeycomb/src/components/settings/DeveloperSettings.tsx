import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateAPIKeyDialog } from './CreateAPIKeyDialog'
import { SDKQuickstart } from '@/components/quickstart'
import { useAPITokens } from '@/hooks/queries/useUser'
import { useUserStore } from '@/stores/userStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { maskToken, formatTokenDate } from '@/lib/user'

export function DeveloperSettings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: tokens, isLoading: tokensLoading } = useAPITokens()
  const user = useUserStore((s) => s.user)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const currentUserId = user?.user_id
  const currentUserName = user ? `${user.firstname} ${user.lastname}` : ''

  // Filter out system tokens and map user names
  const displayTokens = (tokens || [])
    .filter((token) => !token.system)
    .map((token) => ({
      ...token,
      displayName:
        token.user_id === currentUserId ? currentUserName : token.userName || 'Unknown',
    }))

  const handleGenerateNew = () => {
    if (displayTokens.length >= 10) {
      addNotification({
        type: 'warning',
        title: 'Limit reached',
        message: 'You can only have up to 10 API keys at a time.',
      })
      return
    }
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-4">
      {/* API Keys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>API Keys</CardTitle>
          <Button onClick={handleGenerateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Generate New
          </Button>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys yet. Click "Generate New" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.label}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {maskToken(token.token)}
                    </TableCell>
                    <TableCell>{token.displayName}</TableCell>
                    <TableCell>{formatTokenDate(token.create_time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="https://docs.adenhq.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View API Documentation
          </a>
        </CardContent>
      </Card>

      {/* SDK Quickstart Section */}
      <SDKQuickstart />

      <CreateAPIKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
