import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useOrgAuth } from './context/OrgAuthContext'
import LandingPage          from './pages/LandingPage'
import LoginPage            from './pages/LoginPage'
import RegisterPage         from './pages/RegisterPage'
import ForgotPasswordPage   from './pages/ForgotPasswordPage'
import DashboardPage        from './pages/DashboardPage'
import CreateInterviewPage  from './pages/CreateInterviewPage'
import InterviewRoomPage    from './pages/InterviewRoomPage'
import ReportPage           from './pages/ReportPage'
import ProfilePage          from './pages/ProfilePage'
import JoinInterviewPage    from './pages/JoinInterviewPage'
import OrgRegisterPage      from './pages/org/OrgRegisterPage'
import OrgLoginPage         from './pages/org/OrgLoginPage'
import OrgDashboardPage     from './pages/org/OrgDashboardPage'
import OrgCreateInterviewPage from './pages/org/OrgCreateInterviewPage'
import OrgLeaderboardPage   from './pages/org/OrgLeaderboardPage'
import CandidateDetailPage  from './pages/org/CandidateDetailPage'
import ProtectedRoute       from './components/layout/ProtectedRoute'
import AptitudeSetupPage    from './pages/AptitudeSetupPage'
import AptitudeTestScreen   from './pages/AptitudeTestScreen'
import AptitudeReportPage   from './pages/AptitudeReportPage'
import AptitudeDashboardPage from './pages/AptitudeDashboardPage'
import AdminPanelPage       from './pages/AdminPanelPage'
import OrgAptitudeCreatePage  from './pages/org/OrgAptitudeCreatePage'
import OrgAptitudeResultsPage from './pages/org/OrgAptitudeResultsPage'
import AptitudeJoinPage     from './pages/AptitudeJoinPage'

function OrgProtectedRoute() {
  const { org, orgLoading } = useOrgAuth()
  if (orgLoading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
    </div>
  )
  return org ? <Outlet /> : <Navigate to="/org/login" replace />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
    </div>
  )

  return (
    <Routes>
      {/* Public */}
      <Route path="/"          element={<LandingPage />} />
      <Route path="/login"     element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register"  element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
      <Route path="/interview/join/:shareCode" element={<JoinInterviewPage />} />
      <Route path="/aptitude/join/:shareCode"   element={<AptitudeJoinPage />} />

      {/* Org auth */}
      <Route path="/org/register" element={<OrgRegisterPage />} />
      <Route path="/org/login"    element={<OrgLoginPage />} />
      <Route path="/org/forgot-password" element={<ForgotPasswordPage isOrg={true} />} />

      {/* Org protected */}
      <Route element={<OrgProtectedRoute />}>
        <Route path="/org/dashboard"                                    element={<OrgDashboardPage />} />
        <Route path="/org/interview/create"                             element={<OrgCreateInterviewPage />} />
        <Route path="/org/interview/:templateId/leaderboard"            element={<OrgLeaderboardPage />} />
        <Route path="/org/interview/:templateId/candidate/:interviewId" element={<CandidateDetailPage />} />
        <Route path="/org/aptitude/create"                              element={<OrgAptitudeCreatePage />} />
        <Route path="/org/aptitude/:testId/results"                     element={<OrgAptitudeResultsPage />} />
      </Route>

      {/* Candidate protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"              element={<DashboardPage />} />
        <Route path="/profile"                element={<ProfilePage />} />
        <Route path="/interview/create"       element={<CreateInterviewPage />} />
        <Route path="/interview/:id/room"     element={<InterviewRoomPage />} />
        <Route path="/interview/:id/report"   element={<ReportPage />} />
        
        {/* Aptitude */}
        <Route path="/aptitude"               element={<AptitudeDashboardPage />} />
        <Route path="/aptitude/setup"         element={<AptitudeSetupPage />} />
        <Route path="/aptitude/:attemptId/test"   element={<AptitudeTestScreen />} />
        <Route path="/aptitude/:attemptId/report" element={<AptitudeReportPage />} />
        
        {/* Admin protected */}
        <Route path="/admin"                  element={<AdminPanelPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

