import axios from 'axios'

const orgApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach org JWT to every request
orgApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('orgToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — redirect to org login
orgApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('orgToken')
      localStorage.removeItem('org')
      window.location.href = '/org/login'
    }
    return Promise.reject(err)
  }
)

export default orgApi
