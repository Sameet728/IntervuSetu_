import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, registerUser, getMe } from '../api/authAPI'

export const DEMO_USER = {
  _id: '660000000000000000000001',
  id: '660000000000000000000001',
  name: 'Demo Candidate',
  email: 'candidate@intervusetu.ai',
  role: 'candidate',
  plan: 'pro',
  isActive: true,
}

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    const cached = localStorage.getItem('user')
    try {
      return cached ? JSON.parse(cached) : DEMO_USER
    } catch {
      return DEMO_USER
    }
  })
  const [loading, setLoading] = useState(false)

  // Rehydrate on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(DEMO_USER))
      setUser(DEMO_USER)
      return
    }

    getMe()
      .then(res => {
        if (res.data?.user) {
          setUser(res.data.user)
          localStorage.setItem('user', JSON.stringify(res.data.user))
        }
      })
      .catch(() => {
        // Fall back to demo user so testing works without authentication friction
        if (!user) {
          setUser(DEMO_USER)
          localStorage.setItem('user', JSON.stringify(DEMO_USER))
        }
      })
  }, [])

  const login = async (email, password) => {
    try {
      const res = await loginUser({ email, password })
      const { token, user: loggedUser } = res.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(loggedUser))
      setUser(loggedUser)
      return loggedUser
    } catch (err) {
      // In demo mode allow login bypass
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(DEMO_USER))
      setUser(DEMO_USER)
      return DEMO_USER
    }
  }

  const register = async (name, email, password) => {
    try {
      const res = await registerUser({ name, email, password })
      return res.data
    } catch {
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(DEMO_USER))
      setUser(DEMO_USER)
      return { success: true, message: 'Demo mode active' }
    }
  }

  const verifyOtp = async (email, otp) => {
    const { verifySignup } = await import('../api/authAPI')
    const res = await verifySignup({ email, otp })
    const { token, user: verifiedUser } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(verifiedUser))
    setUser(verifiedUser)
    return verifiedUser
  }

  const logout = () => {
    // Reset back to demo user
    setUser(DEMO_USER)
    localStorage.setItem('token', 'demo-token')
    localStorage.setItem('user', JSON.stringify(DEMO_USER))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
