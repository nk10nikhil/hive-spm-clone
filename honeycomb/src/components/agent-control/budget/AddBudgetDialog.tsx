import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BudgetType, LimitAction } from '@/types/agentControl'

interface AddBudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const budgetTypes: { value: BudgetType; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'agent', label: 'Agent' },
  { value: 'customer', label: 'Customer' },
  { value: 'feature', label: 'Feature' },
  { value: 'tag', label: 'Tag' },
]

const limitActions: { value: LimitAction; label: string; description: string }[] = [
  { value: 'notify', label: 'Notify Only', description: 'Send alerts but continue' },
  { value: 'throttle', label: 'Throttle', description: 'Reduce request rate' },
  { value: 'degrade', label: 'Degrade', description: 'Switch to cheaper model' },
  { value: 'kill', label: 'Kill', description: 'Stop all requests' },
]

/**
 * Dialog for creating a new budget configuration.
 */
export function AddBudgetDialog({ open, onOpenChange }: AddBudgetDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BudgetType>('agent')
  const [limit, setLimit] = useState('100')
  const [limitAction, setLimitAction] = useState<LimitAction>('notify')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const limitValue = parseFloat(limit)
    if (isNaN(limitValue) || limitValue <= 0) {
      setError('Limit must be greater than 0')
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Integrate with actual API when policyId is available
      // For now, just close the dialog
      console.log('Creating budget:', {
        name,
        type,
        limit: limitValue,
        limitAction,
        alertThreshold: parseFloat(alertThreshold) || undefined,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setType('agent')
    setLimit('100')
    setLimitAction('notify')
    setAlertThreshold('80')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>
            Set up a new budget to control costs for agents, models, or features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Agent Budget"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(value) => setType(value as BudgetType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {budgetTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Limit */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Budget Limit ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="100.00"
            />
          </div>

          {/* Limit Action */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action at Limit</label>
            <Select
              value={limitAction}
              onValueChange={(value) => setLimitAction(value as LimitAction)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {limitActions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    <div className="flex flex-col">
                      <span>{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Alert Threshold (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground">
              Receive alerts when spending reaches this percentage
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
