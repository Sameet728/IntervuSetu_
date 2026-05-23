import api from './axios'

export const registerUser  = (data) => api.post('/auth/register', data)
export const loginUser     = (data) => api.post('/auth/login', data)
export const getMe         = ()     => api.get('/auth/me')

// Profile update — supports multipart/form-data for resume
export const updateProfile = (data) => {
  const isFormData = data instanceof FormData
  return api.put('/auth/profile', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  })
}

// Quick theme update
export const updateTheme = (theme) => api.put('/auth/theme', { theme })
