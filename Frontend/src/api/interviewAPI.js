import api from './axios'

export const createInterview  = (data)       => api.post('/interviews/create', data)
export const getMyInterviews  = (params)     => api.get('/interviews', { params })
export const getInterview     = (id)         => api.get(`/interviews/${id}`)
export const getTranscript    = (id)         => api.get(`/interviews/${id}/transcript`)
export const submitInterview  = (id)         => api.post(`/interviews/${id}/submit`)
export const deleteInterview  = (id)         => api.delete(`/interviews/${id}`)
