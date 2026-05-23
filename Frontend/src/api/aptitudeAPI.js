import api from './axios'

export const startAptitudeTest = (data) => api.post('/aptitude/start', data)
export const checkAptitudeAvailability = (data) => api.post('/aptitude/check-availability', data)
export const submitAptitudeTest = (attemptId, data) => api.post(`/aptitude/${attemptId}/submit`, data)
export const getAptitudeReport = (attemptId) => api.get(`/aptitude/${attemptId}/report`)
export const getAptitudeHistory = () => api.get('/aptitude/history')
export const getAptitudeCompanies = () => api.get('/aptitude/companies')
export const getAptitudeTopics = () => api.get('/aptitude/topics')

export const downloadAptitudePDF = async (attemptId, filename) => {
  const res = await api.get(`/aptitude/${attemptId}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename || `aptitude_report_${attemptId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
