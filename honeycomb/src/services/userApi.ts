import { serverClient } from './api'
import type {
  UserProfileResponse,
  UpdateProfilePayload,
  UpdateAvatarPayload,
  APITokensResponse,
  APITokenResponse,
  CreateAPITokenPayload,
  TeamRoleResponse,
} from '@/types/user'

// Profile Management
export const getUserProfile = () =>
  serverClient.get<UserProfileResponse>('/user/profile')

export const updateUserProfile = (data: UpdateProfilePayload) =>
  serverClient.put<{ message: string }>('/user/profile', data)

export const updateUserAvatar = (data: UpdateAvatarPayload) =>
  serverClient.post<{ data: string }>('/user/set-user-avatar', data)

// API Tokens (Developer Tools)
export const getAPITokens = () =>
  serverClient.get<APITokensResponse>('/user/get-dev-tokens')

export const createAPIToken = (label: string, ttl: number = 157680000) =>
  serverClient.post<APITokenResponse>('/user/generate-dev-token', {
    label,
    ttl, // Default: ~5 years
  } as CreateAPITokenPayload)

// Team/Role (needed for org initialization)
export const getTeamRoleId = (teamId: string) =>
  serverClient.get<TeamRoleResponse>(`/iam/team/get-team-role-by-id/${teamId}`)
