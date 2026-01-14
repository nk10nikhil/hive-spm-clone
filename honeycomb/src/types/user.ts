// User profile
export interface User {
  firstname: string
  lastname: string
  email: string
  company_name?: string
  profile_img_url?: string
  roleId?: number
  user_id: number
  team_id: number
  roles: string[]
}

// Organization (auto-linked to user)
export interface Organization {
  orgId: number
  orgName: string
  teamId: number
  teamName: string
}

// API Token for developer tools
export interface APIToken {
  id: string
  token: string
  label: string
  user_id: number
  userName?: string
  create_time: number
  system?: boolean
}

// API response types - backend returns data directly (no wrapper)
export type UserProfileResponse = User

export type OrganizationResponse = Organization

export type APITokensResponse = APIToken[]

export type APITokenResponse = APIToken

export interface TeamRoleResponse {
  roleId: number
}

// Update payloads
export interface UpdateProfilePayload {
  firstname?: string
  lastname?: string
  email?: string
  oldPassword?: string
  newPassword?: string
}

export interface UpdateAvatarPayload {
  userAvatar: string
}

export interface UpdateOrgLogoPayload {
  orgId: number
  orgLogo: string
}

export interface UpdateOrgNamePayload {
  name: string
  orgId: number
}

export interface CreateAPITokenPayload {
  label: string
  ttl?: number
}
