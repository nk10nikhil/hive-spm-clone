import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { copyToClipboard } from '@/lib/quickstart'
import { useNotificationStore } from '@/stores/notificationStore'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      addNotification({
        type: 'error',
        title: 'Copy failed',
        message: 'Failed to copy code to clipboard',
      })
    }
  }, [code, addNotification])

  return (
    <div
      className={cn(
        'my-4 rounded-lg border bg-muted/50 overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted">
        {language && (
          <span className="text-xs font-medium text-muted-foreground lowercase">
            {language}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 ml-auto"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono">{code.trimEnd()}</code>
      </pre>
    </div>
  )
}
