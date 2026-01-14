export interface LoginCredentials {
  email: string
  password: string
  grantToken?: string
}

export interface LoginResponse {
  token: string
  mustResetPassword?: boolean
}

export interface OrgInfo {
  orgName: string
  orgId: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstname: string
  lastname: string
}

export interface RegisterResponse {
  token: string
}
