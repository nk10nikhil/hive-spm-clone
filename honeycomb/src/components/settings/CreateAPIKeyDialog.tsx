import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAPIToken } from '@/hooks/queries/useUser'
import { useNotificationStore } from '@/stores/notificationStore'
import { isValidTokenLabel } from '@/lib/user'

interface CreateAPIKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAPIKeyDialog({
  open,
  onOpenChange,
}: CreateAPIKeyDialogProps) {
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const createToken = useCreateAPIToken()
  const addNotification = useNotificationStore((s) => s.addNotification)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTokenName('')
      setNewToken('')
      setShowToken(false)
      setError('')
      setCopied(false)
    }
  }, [open])

  const handleCreate = async () => {
    if (!tokenName.trim()) {
      setError('Please enter a name for the API key')
      return
    }

    if (!isValidTokenLabel(tokenName)) {
      setError('Please only use letters, numbers, and underscores')
      return
    }

    setError('')

    try {
      const result = await createToken.mutateAsync(tokenName)
      setNewToken(result.token)
      setShowToken(true)
      addNotification({
        type: 'success',
        title: 'API key created',
        message: 'Your new API key has been created successfully.',
      })
    } catch {
      addNotification({
        type: 'error',
        title: 'Creation failed',
        message: 'Failed to create API key. Please try again.',
      })
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addNotification({
        type: 'error',
        title: 'Copy failed',
        message: 'Failed to copy to clipboard.',
      })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an API Key</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter a name for the API key
          </p>

          <Input
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Enter letters, numbers, and underscores"
            disabled={showToken}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showToken) handleCreate()
            }}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!showToken && (
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createToken.isPending}
              >
                {createToken.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          )}

          {showToken && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <p className="text-xs text-amber-600">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="relative">
                <Textarea
                  value={newToken}
                  readOnly
                  className="pr-12 font-mono text-sm resize-none"
                  rows={4}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute bottom-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter className="pt-2">
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
