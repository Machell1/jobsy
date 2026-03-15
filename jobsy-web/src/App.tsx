import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SearchPage from './pages/SearchPage'
import ProviderPage from './pages/ProviderPage'
import BookingsPage from './pages/BookingsPage'
import MessagesPage from './pages/MessagesPage'
import NoticeboardPage from './pages/NoticeboardPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import ReviewsPage from './pages/ReviewsPage'
import DiscoverPage from './pages/DiscoverPage'
import MatchesPage from './pages/MatchesPage'
import PaymentsPage from './pages/PaymentsPage'
import JobBoardPage from './pages/JobBoardPage'
import ListingsPage from './pages/ListingsPage'
import BusinessPage from './pages/BusinessPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import NotFoundPage from './pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/provider/:id" element={<ProtectedRoute><ProviderPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/noticeboard" element={<ProtectedRoute><NoticeboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
        <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
        <Route path="/job-board" element={<ProtectedRoute><JobBoardPage /></ProtectedRoute>} />
        <Route path="/listings" element={<ProtectedRoute><ListingsPage /></ProtectedRoute>} />
        <Route path="/business" element={<ProtectedRoute><BusinessPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
