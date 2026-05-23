import api from './axios'

export const getQuestions = () => api.get('/admin/questions')
export const addQuestion = (data) => api.post('/admin/questions', data)
export const deleteQuestion = (id) => api.delete(`/admin/questions/${id}`)
export const bulkUploadQuestions = (data) => api.post('/admin/questions/bulk', data)
