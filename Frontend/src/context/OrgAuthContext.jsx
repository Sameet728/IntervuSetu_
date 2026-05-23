import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { orgGetMe } from '../api/orgAPI'

const OrgAuthContext = createContext(null)
export const useOrgAuth = () => useContext(OrgAuthContext)

export function OrgAuthProvider({ children }) {
  const [org, setOrg] = useState(null)
  const [orgLoading, setOrgLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('orgToken')
    if (!token) { setOrgLoading(false); return }

    orgGetMe()
      .then((res) => setOrg(res.data.data))
      .catch(() => {
        localStorage.removeItem('orgToken')
        localStorage.removeItem('org')
      })
      .finally(() => setOrgLoading(false))
  }, [])

  const orgLogin = useCallback((token, orgData) => {
    localStorage.setItem('orgToken', token)
    localStorage.setItem('org', JSON.stringify(orgData))
    setOrg(orgData)
  }, [])

  const orgVerifyOtp = async (email, otp) => {
    const { orgVerifySignup } = await import('../api/orgAPI')
    const res = await orgVerifySignup({ email, otp })
    orgLogin(res.data.token, res.data.data)
    return res.data
  }

  const orgLogout = useCallback(() => {
    localStorage.removeItem('orgToken')
    localStorage.removeItem('org')
    setOrg(null)
  }, [])

  return (
    <OrgAuthContext.Provider value={{ org, orgLoading, orgLogin, orgVerifyOtp, orgLogout }}>
      {children}
    </OrgAuthContext.Provider>
  )
}
