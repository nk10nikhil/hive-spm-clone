import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdatePassword } from '@/hooks/queries/useUser'
import { useNotificationStore } from '@/stores/notificationStore'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormErrors {
  oldPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const updatePassword = useUpdatePassword()
  const addNotification = useNotificationStore((s) => s.addNotification)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!oldPassword) {
      newErrors.oldPassword = 'Please enter your old password'
    } else if (oldPassword.length < 10) {
      newErrors.oldPassword = 'Password must be at least 10 characters'
    }

    if (!newPassword) {
      newErrors.newPassword = 'Please enter your new password'
    } else if (newPassword.length < 10) {
      newErrors.newPassword = 'Password must be at least 10 characters'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password'
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await updatePassword.mutateAsync({
        oldPassword,
        newPassword,
      })
      addNotification({
        type: 'success',
        title: 'Password updated',
        message: 'Your password has been updated successfully.',
      })
      onOpenChange(false)
    } catch {
      addNotification({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update password. Please check your old password.',
      })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Old Password</label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter your current password"
            />
            {errors.oldPassword && (
              <p className="text-sm text-red-500">{errors.oldPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
