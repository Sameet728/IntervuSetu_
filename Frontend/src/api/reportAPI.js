import api from './axios'

export const getReport       = (interviewId) => api.get(`/reports/${interviewId}`)
export const getUserReports  = (params)      => api.get('/reports/user/history', { params })
export const downloadPDF     = async (interviewId, filename) => {
  const res = await api.get(`/reports/${interviewId}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename || `interview_report_${interviewId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
