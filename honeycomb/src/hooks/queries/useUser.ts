import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as userApi from '@/services/userApi'
import * as orgApi from '@/services/orgApi'
import type {
  UpdateProfilePayload,
  UpdateOrgNamePayload,
} from '@/types/user'

// =============================================================================
// Profile Query Hooks
// =============================================================================

/**
 * Fetch user profile
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update user profile (name, email, password)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => userApi.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

/**
 * Update user avatar
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (avatarBase64: string) =>
      userApi.updateUserAvatar({ userAvatar: avatarBase64 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

/**
 * Update password (convenience wrapper)
 */
export function useUpdatePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string
      newPassword: string
    }) =>
      userApi.updateUserProfile({
        oldPassword,
        newPassword,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

// =============================================================================
// Organization Query Hooks
// =============================================================================

/**
 * Fetch current organization
 */
export function useCurrentOrg() {
  return useQuery({
    queryKey: ['org', 'current'],
    queryFn: orgApi.getCurrentTeam,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update organization name
 */
export function useUpdateOrgName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateOrgNamePayload) => orgApi.updateOrgName(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'current'] })
    },
  })
}

/**
 * Update organization logo
 */
export function useUpdateOrgLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, logoBase64 }: { orgId: number; logoBase64: string }) =>
      orgApi.setOrganizationLogo({ orgId, orgLogo: logoBase64 }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'logo', variables.orgId] })
    },
  })
}

/**
 * Fetch all organizations user belongs to
 * NOTE: Disabled - endpoint not available yet
 */
export function useOrganizations() {
  return useQuery({
    queryKey: ['org', 'list'],
    queryFn: orgApi.getOrganizations,
    staleTime: 5 * 60 * 1000,
    enabled: false, // Disabled until backend supports this endpoint
  })
}

/**
 * Switch to a different organization
 */
export function useSwitchOrganization() {
  return useMutation({
    mutationFn: orgApi.setCurrentTeam,
    onSuccess: (res) => {
      localStorage.setItem('token', `jwt ${res.data.token}`)
      localStorage.removeItem('context_session_id')
      sessionStorage.clear()
      window.location.reload()
    },
  })
}

// =============================================================================
// API Tokens Query Hooks (Developer Tools)
// =============================================================================

/**
 * Fetch all API tokens
 */
export function useAPITokens() {
  return useQuery({
    queryKey: ['user', 'api-tokens'],
    queryFn: async () => {
      const response = await userApi.getAPITokens()
      // Backend returns { data: APIToken[] }
      return (response as unknown as { data: typeof response }).data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Create a new API token
 */
export function useCreateAPIToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (label: string) => {
      const response = await userApi.createAPIToken(label)
      // Backend returns { success: true, data: APIToken }
      return (response as unknown as { data: typeof response }).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'api-tokens'] })
    },
  })
}
