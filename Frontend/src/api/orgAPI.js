import orgApi from './orgAxios'
import api from './axios' // for the public join endpoint

// ─── Auth ──────────────────────────────────────────────────────────
export const orgRegister = (formData) =>
  orgApi.post('/org/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export const orgLogin = (data) => orgApi.post('/org/auth/login', data)
export const orgGetMe = () => orgApi.get('/org/auth/me')
export const orgUpdateProfile = (formData) =>
  orgApi.put('/org/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ─── Interview Templates ───────────────────────────────────────────
export const createTemplate = (data) => orgApi.post('/org/interviews', data)
export const getTemplates = () => orgApi.get('/org/interviews')
export const getTemplate = (templateId) => orgApi.get(`/org/interviews/${templateId}`)
export const updateTemplate = (templateId, data) => orgApi.put(`/org/interviews/${templateId}`, data)
export const deleteTemplate = (templateId) => orgApi.delete(`/org/interviews/${templateId}`)
export const closeTemplate = (templateId) => orgApi.patch(`/org/interviews/${templateId}/close`)
export const getLeaderboard = (templateId, params) =>
  orgApi.get(`/org/interviews/${templateId}/leaderboard`, { params })
export const getAnalytics = (templateId) => orgApi.get(`/org/interviews/${templateId}/analytics`)
export const sendInvite = (templateId, data) => orgApi.post(`/org/interviews/${templateId}/invite`, data)

// ─── Candidates ────────────────────────────────────────────────────
export const getCandidateDetail = (templateId, interviewId) =>
  orgApi.get(`/org/candidates/${templateId}/${interviewId}`)
export const updateCandidateStatus = (templateId, interviewId, status) =>
  orgApi.patch(`/org/candidates/${templateId}/${interviewId}/status`, { status })
export const exportLeaderboardCSV = (templateId) => {
  const token = localStorage.getItem('orgToken')
  const url = `${import.meta.env.VITE_API_URL || '/api'}/org/candidates/${templateId}/export`
  window.open(`${url}?token=${token}`, '_blank')
}

// ─── Public join endpoint (uses regular axios, no org token) ──────
export const getTemplateInfo = (shareCode) => api.get(`/interviews/join/${shareCode}`)

// ─── Org Aptitude Tests ──────────────────────────────────────────────
export const createOrgAptitudeTest = (data) => orgApi.post('/org/aptitude/create', data)
export const getOrgAptitudeTests = () => orgApi.get('/org/aptitude')
export const closeOrgAptitudeTest = (testId) => orgApi.patch(`/org/aptitude/${testId}/close`)
export const deleteOrgAptitudeTest = (testId) => orgApi.delete(`/org/aptitude/${testId}`)
export const getOrgAptitudeLeaderboard = (testId, params) => orgApi.get(`/org/aptitude/${testId}/leaderboard`, { params })
export const getOrgAptitudeAnalytics = (testId) => orgApi.get(`/org/aptitude/${testId}/analytics`)
export const updateOrgCandidateStatus = (testId, attemptId, status) =>
  orgApi.patch(`/org/aptitude/${testId}/candidate/${attemptId}/status`, { status })
export const sendOrgAptitudeInvite = (testId, data) => orgApi.post(`/org/aptitude/${testId}/invite`, data)
export const exportOrgAptitudeCSV = (testId) => {
  const token = localStorage.getItem('orgToken')
  window.open(`${orgApi.defaults.baseURL}/org/aptitude/${testId}/export?token=${token}`, '_blank')
}
// Public: get test info by shareCode (no auth)
export const getOrgAptitudeTestInfo = (shareCode) => api.get(`/org/aptitude/join/${shareCode}`)
