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

  const orgLogout = useCallback(() => {
    localStorage.removeItem('orgToken')
    localStorage.removeItem('org')
    setOrg(null)
  }, [])

  return (
    <OrgAuthContext.Provider value={{ org, orgLoading, orgLogin, orgLogout }}>
      {children}
    </OrgAuthContext.Provider>
  )
}
