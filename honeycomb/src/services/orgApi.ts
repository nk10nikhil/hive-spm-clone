import { serverClient } from './api'
import type {
  Organization,
  OrganizationResponse,
  UpdateOrgLogoPayload,
  UpdateOrgNamePayload,
} from '@/types/user'

// Organization Management
export const getCurrentTeam = () =>
  serverClient.get<OrganizationResponse>('/iam/get-current-team')

export const setOrganizationLogo = (payload: UpdateOrgLogoPayload) =>
  serverClient.post<{ message: string }>('/iam/set-organization-logo', payload)

export const updateOrgName = (payload: UpdateOrgNamePayload) =>
  serverClient.post<{ message: string }>('/iam/org/rename', payload)

// Fetch all organizations user belongs to
export const getOrganizations = () =>
  serverClient.get<Organization[]>('/iam/get-user-organizations')

// Switch to a different organization
export const setCurrentTeam = (payload: { teamId: number }) =>
  serverClient.post<{ data: { token: string } }>('/iam/set-current-team', payload)
