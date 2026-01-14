import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import AdenLogo from '@/assets/aden-logo.svg'
import { getOrgInfoByPath } from '@/services/authApi'

export function LoginPage() {
  const { org } = useParams<{ org?: string }>()
  const [searchParams] = useSearchParams()
  const [orgName, setOrgName] = useState<string | undefined>()
  const [isLoadingOrg, setIsLoadingOrg] = useState(!!org)

  const hasInviteToken = !!(
    searchParams.get('t') ||
    searchParams.get('data') ||
    searchParams.get('token')
  )

  useEffect(() => {
    document.title = org ? `${org} - Login` : 'Login'

    if (org) {
      getOrgInfoByPath(org)
        .then((res) => setOrgName(res.data.orgName))
        .catch(() => setOrgName(undefined))
        .finally(() => setIsLoadingOrg(false))
    }
  }, [org])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <img src={AdenLogo} alt="Aden" className="h-6" />

        <div className="w-[400px] border border-border rounded-lg p-6">
          {isLoadingOrg ? (
            <div className="h-4 bg-muted animate-pulse rounded w-2/3 mx-auto mb-4" />
          ) : null}

          <LoginForm orgPath={org} orgName={orgName} showSignup={!hasInviteToken} />
        </div>
      </div>
    </div>
  )
}
