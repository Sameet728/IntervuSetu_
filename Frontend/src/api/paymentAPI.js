import axios from 'axios'
import { API_BASE_URL } from './axios'

const api = axios.create({
  baseURL: `${API_BASE_URL}/payment`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const createOrder = () => api.post('/create-order')
export const verifyPayment = (paymentData) => api.post('/verify', paymentData)
