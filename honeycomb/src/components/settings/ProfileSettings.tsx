import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/user/UserAvatar'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import {
  useUpdateAvatar,
  useUpdateProfile,
  useUpdateOrgName,
  useUpdateOrgLogo,
  useOrganizations,
  useSwitchOrganization,
} from '@/hooks/queries/useUser'
import { useUserStore } from '@/stores/userStore'
import { useNotificationStore } from '@/stores/notificationStore'

export function ProfileSettings() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newFirstname, setNewFirstname] = useState('')
  const [newLastname, setNewLastname] = useState('')
  const [isEditingOrgName, setIsEditingOrgName] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  const user = useUserStore((s) => s.user)
  const fullName = useUserStore((s) => s.fullName())
  const setUser = useUserStore((s) => s.setUser)
  const org = useUserStore((s) => s.org)
  const orgLogo = useUserStore((s) => s.orgLogo)

  const updateAvatar = useUpdateAvatar()
  const updateProfile = useUpdateProfile()
  const updateOrgName = useUpdateOrgName()
  const updateOrgLogo = useUpdateOrgLogo()
  const { data: organizationsData } = useOrganizations()
  const switchOrganization = useSwitchOrganization()
  const addNotification = useNotificationStore((s) => s.addNotification)

  const organizations = organizationsData || []
  const hasMultipleOrgs = organizations.length > 1

  const handleAvatarUpload = async (base64: string) => {
    try {
      await updateAvatar.mutateAsync(base64)
      addNotification({
        type: 'success',
        title: 'Avatar updated',
        message: 'Your avatar has been updated successfully.',
      })
    } catch {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: 'Failed to update avatar. Please try again.',
      })
    }
  }

  const startEditingName = () => {
    setIsEditingName(true)
    setNewFirstname(user?.firstname || '')
    setNewLastname(user?.lastname || '')
  }

  const cancelEditingName = () => {
    setIsEditingName(false)
    setNewFirstname('')
    setNewLastname('')
  }

  const saveName = async () => {
    if (!newFirstname.trim() || !newLastname.trim()) {
      addNotification({
        type: 'error',
        title: 'Invalid name',
        message: 'First name and last name cannot be empty.',
      })
      return
    }

    try {
      await updateProfile.mutateAsync({
        firstname: newFirstname.trim(),
        lastname: newLastname.trim(),
      })
      // Update the Zustand store for immediate UI update
      if (user) {
        setUser({
          ...user,
          firstname: newFirstname.trim(),
          lastname: newLastname.trim(),
        })
      }
      addNotification({
        type: 'success',
        title: 'Name updated',
        message: 'Your name has been updated successfully.',
      })
      setIsEditingName(false)
    } catch {
      addNotification({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update name. Please try again.',
      })
    }
  }

  const startEditingOrgName = () => {
    setIsEditingOrgName(true)
    setNewOrgName(org?.orgName || '')
  }

  const cancelEditingOrgName = () => {
    setIsEditingOrgName(false)
    setNewOrgName('')
  }

  const saveOrgName = async () => {
    if (!newOrgName.trim()) {
      addNotification({
        type: 'error',
        title: 'Invalid name',
        message: 'Organization name cannot be empty.',
      })
      return
    }

    if (!org?.orgId) return

    try {
      await updateOrgName.mutateAsync({
        name: newOrgName.trim(),
        orgId: org.orgId,
      })
      addNotification({
        type: 'success',
        title: 'Name updated',
        message: 'Organization name has been updated successfully.',
      })
      setIsEditingOrgName(false)
    } catch {
      addNotification({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update organization name.',
      })
    }
  }

  const handleLogoUpload = async (base64: string) => {
    if (!org?.orgId) return

    try {
      await updateOrgLogo.mutateAsync({
        orgId: org.orgId,
        logoBase64: base64,
      })
      addNotification({
        type: 'success',
        title: 'Logo updated',
        message: 'Organization logo has been updated successfully.',
      })
    } catch {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: 'Failed to update organization logo.',
      })
    }
  }

  const handleSwitchOrganization = (teamIdStr: string) => {
    const teamId = Number(teamIdStr)
    if (teamId === org?.teamId) return
    switchOrganization.mutate({ teamId })
  }

  return (
    <>
      {/* User Settings */}
      <Card>
        <CardHeader>
          <CardTitle>User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="flex items-center gap-4">
            <span className="w-36 text-sm text-muted-foreground">Name</span>

            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newFirstname}
                  onChange={(e) => setNewFirstname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') cancelEditingName()
                  }}
                  placeholder="First name"
                  className="w-32"
                  autoFocus
                />
                <Input
                  value={newLastname}
                  onChange={(e) => setNewLastname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') cancelEditingName()
                  }}
                  placeholder="Last name"
                  className="w-32"
                />
                <Button
                  size="sm"
                  onClick={saveName}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditingName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{fullName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={startEditingName}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center">
            <span className="w-36 text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user?.email}</span>
          </div>

          {/* Password */}
          <div className="flex items-center">
            <span className="w-36 text-sm text-muted-foreground">Password</span>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
              Change Password
            </Button>
          </div>

          {/* Avatar */}
          <div className="flex items-center">
            <span className="w-36 text-sm text-muted-foreground">Avatar</span>
            <UserAvatar
              src={user?.profile_img_url}
              name={fullName}
              size="lg"
              showUpload
              onUpload={handleAvatarUpload}
              isLoading={updateAvatar.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Logo */}
          <div className="flex items-center gap-4">
            <UserAvatar
              src={orgLogo}
              name={org?.orgName || ''}
              size="xl"
              showUpload
              onUpload={handleLogoUpload}
              isLoading={updateOrgLogo.isPending}
            />
            <div className="text-sm text-muted-foreground">
              Click to upload a new logo.
              <br />
              Max size: 2MB
            </div>
          </div>

          {/* Organization Name */}
          <div className="flex items-center gap-4">
            <span className="w-36 text-sm text-muted-foreground">Name</span>

            {isEditingOrgName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveOrgName()
                    if (e.key === 'Escape') cancelEditingOrgName()
                  }}
                  className="w-48"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={saveOrgName}
                  disabled={updateOrgName.isPending}
                >
                  {updateOrgName.isPending ? (
                    <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditingOrgName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{org?.orgName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={startEditingOrgName}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* Change Organization */}
          {hasMultipleOrgs && (
            <div className="flex items-center gap-4">
              <span className="w-36 text-sm text-muted-foreground">
                Switch Organization
              </span>
              <Select
                value={org?.teamId != null ? String(org.teamId) : undefined}
                onValueChange={handleSwitchOrganization}
                disabled={switchOrganization.isPending}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.teamId} value={String(organization.teamId)}>
                      {organization.orgName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {switchOrganization.isPending && (
                <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
    </>
  )
}
