import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/admin`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getQuestions = () => api.get('/questions')
export const addQuestion = (data) => api.post('/questions', data)
export const deleteQuestion = (id) => api.delete(`/questions/${id}`)
export const bulkUploadQuestions = (data) => api.post('/questions/bulk', data)
