import { serverClient } from './api'
import type {
  LoginCredentials,
  LoginResponse,
  OrgInfo,
  RegisterCredentials,
  RegisterResponse,
} from '@/types/auth'

export const submitLogin = (credentials: LoginCredentials): Promise<LoginResponse> =>
  serverClient.post<LoginResponse>('/user/login-v2', credentials)

export const getOrgInfoByPath = (orgPath: string): Promise<{ data: OrgInfo }> =>
  serverClient.get<{ data: OrgInfo }>(`/iam/org/info/${orgPath}`)

export const submitRegister = (credentials: RegisterCredentials): Promise<RegisterResponse> =>
  serverClient.post<RegisterResponse>('/user/register', credentials)
