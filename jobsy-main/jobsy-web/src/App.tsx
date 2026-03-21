import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoadingState from './components/LoadingState'

// Critical routes — eager loaded
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// All other routes — lazy loaded for code splitting
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
const SearchPage = React.lazy(() => import('./pages/SearchPage'))
const ProviderPage = React.lazy(() => import('./pages/ProviderPage'))
const BookingsPage = React.lazy(() => import('./pages/BookingsPage'))
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'))
const NoticeboardPage = React.lazy(() => import('./pages/NoticeboardPage'))
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'))
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'))
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage'))
const DiscoverPage = React.lazy(() => import('./pages/DiscoverPage'))
const MatchesPage = React.lazy(() => import('./pages/MatchesPage'))
const PaymentsPage = React.lazy(() => import('./pages/PaymentsPage'))
const JobBoardPage = React.lazy(() => import('./pages/JobBoardPage'))
const ListingsPage = React.lazy(() => import('./pages/ListingsPage'))
const BusinessPage = React.lazy(() => import('./pages/BusinessPage'))
const AboutPage = React.lazy(() => import('./pages/AboutPage'))
const ContactPage = React.lazy(() => import('./pages/ContactPage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'))
const RefundPolicyPage = React.lazy(() => import('./pages/RefundPolicyPage'))
const CommunityGuidelinesPage = React.lazy(() => import('./pages/CommunityGuidelinesPage'))
const AdvertiserTermsPage = React.lazy(() => import('./pages/AdvertiserTermsPage'))
const ContractTermsPage = React.lazy(() => import('./pages/ContractTermsPage'))
const EventsPage = React.lazy(() => import('./pages/EventsPage'))
const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage'))
const CreateEventPage = React.lazy(() => import('./pages/CreateEventPage'))
const EventDashboardPage = React.lazy(() => import('./pages/EventDashboardPage'))
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'))
const AdvertiserDashboardPage = React.lazy(() => import('./pages/AdvertiserDashboardPage'))
const ContractPage = React.lazy(() => import('./pages/ContractPage'))
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'))
const DisputesPage = React.lazy(() => import('./pages/DisputesPage'))
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const ROUTE_TITLES: Record<string, string> = {
  '/': "Jobsy \u2014 Jamaica's Service Marketplace",
  '/login': 'Sign In',
  '/register': 'Create Account',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/dashboard': 'Dashboard',
  '/search': 'Search',
  '/bookings': 'Bookings',
  '/messages': 'Messages',
  '/noticeboard': 'Noticeboard',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/reviews': 'Reviews',
  '/discover': 'Discover',
  '/matches': 'Matches',
  '/payments': 'Payments',
  '/job-board': 'Job Board',
  '/listings': 'Listings',
  '/business': 'Business',
  '/about': 'About',
  '/contact': 'Contact',
  '/events': 'Pan di Ends',
  '/events/create': 'Create Event',
  '/referrals': 'Refer & Earn',
  '/advertiser': 'Advertiser Dashboard',
  '/disputes': 'Disputes',
  '/admin': 'Admin Dashboard',
  '/privacy-policy': 'Privacy Policy',
  '/terms-of-service': 'Terms of Service',
  '/refund-policy': 'Refund Policy',
  '/community-guidelines': 'Community Guidelines',
  '/advertiser-terms': 'Advertiser Terms',
  '/contract-terms': 'Contract Terms',
}

const DEFAULT_TITLE = "Jobsy \u2014 Jamaica's Service Marketplace"

export default function App() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    const title = ROUTE_TITLES[path] || DEFAULT_TITLE
    document.title = title === DEFAULT_TITLE ? title : `${title} | Jobsy`
  }, [location.pathname])

  return (
    <Layout>
      <Suspense fallback={<LoadingState fullPage message="Loading page..." />}>
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
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
          <Route path="/advertiser-terms" element={<AdvertiserTermsPage />} />
          <Route path="/contract-terms" element={<ContractTermsPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/provider/:id" element={<ProviderPage />} />
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
          <Route path="/job-board" element={<JobBoardPage />} />
          <Route path="/listings" element={<ProtectedRoute><ListingsPage /></ProtectedRoute>} />
          <Route path="/business" element={<ProtectedRoute><BusinessPage /></ProtectedRoute>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="/events/:id/dashboard" element={<ProtectedRoute><EventDashboardPage /></ProtectedRoute>} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/advertiser" element={<ProtectedRoute><AdvertiserDashboardPage /></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/disputes/:id" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
