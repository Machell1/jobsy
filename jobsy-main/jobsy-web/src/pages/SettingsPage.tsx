import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut, apiPost, apiDelete, ApiError, API_BASE } from '../lib/api'
import {
  Settings,
  User,
  Lock,
  Shield,
  Bell,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Download,
  Database,
} from 'lucide-react'
import PhoneInput from '../components/ui/PhoneInput'

const passwordChecks = (password: string) => [
  { label: '8+ characters', met: password.length >= 8 },
  { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
  { label: 'Lowercase letter', met: /[a-z]/.test(password) },
  { label: 'Number', met: /\d/.test(password) },
  { label: 'Special character (!@#$%...)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password) },
]

const isPasswordValid = (password: string) => passwordChecks(password).every(c => c.met)

interface Profile {
  id: string
  display_name?: string
  phone?: string
  email?: string
  bio?: string
  active_role?: string
  roles?: string[]
}

interface NotifPrefs {
  email_notifications?: boolean
  push_notifications?: boolean
  sms_notifications?: boolean
  booking_updates?: boolean
  new_messages?: boolean
  promotional?: boolean
}

export default function SettingsPage() {
  const { token, user, logout, setActiveRole, activeRole, roles } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ['profile', 'me'],
    queryFn: () => apiGet('/api/profiles/me', token),
    enabled: !!token,
  })

  const { data: notifPrefs, isLoading: notifLoading } = useQuery<NotifPrefs>({
    queryKey: ['notif-prefs'],
    queryFn: () => apiGet('/api/notifications/preferences', token),
    enabled: !!token,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPut('/api/profiles/me', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Profile updated successfully' })
      setEditingField(null)
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Failed to update profile'
      toast({ title: 'Update failed', description: message, variant: 'destructive' })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiPost('/auth/change-password', data, token),
    onSuccess: () => {
      toast({ title: 'Password changed successfully' })
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Failed to change password'
      toast({ title: 'Password change failed', description: message, variant: 'destructive' })
    },
  })

  const switchRoleMutation = useMutation({
    mutationFn: (role: string) =>
      apiPost('/auth/roles/switch', { role }, token),
    onSuccess: (_data, role) => {
      setActiveRole(role)
      toast({ title: `Switched to ${role} role` })
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Failed to switch role'
      toast({ title: 'Role switch failed', description: message, variant: 'destructive' })
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiDelete('/auth/me', token),
    onSuccess: () => {
      toast({ title: 'Account deleted', description: 'Your data has been anonymized per GDPR requirements.' })
      logout()
      navigate('/login')
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Failed to delete account'
      toast({ title: 'Delete failed', description: message, variant: 'destructive' })
    },
  })

  const [isExporting, setIsExporting] = useState(false)
  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, body.detail || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'jobsy-data-export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Data exported', description: 'Your data download has started.' })
    } catch (error: unknown) {
      const message = error instanceof ApiError ? error.detail : 'Failed to export data'
      toast({ title: 'Export failed', description: message, variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const updateNotifMutation = useMutation({
    mutationFn: (data: Partial<NotifPrefs>) =>
      apiPut('/api/notifications/preferences', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-prefs'] })
      toast({ title: 'Notification preferences updated' })
    },
    onError: () => {
      toast({ title: 'Failed to update preferences', variant: 'destructive' })
    },
  })

  const startEditing = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value || '')
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValue('')
  }

  const saveField = (field: string) => {
    updateProfileMutation.mutate({ [field]: editValue })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (!isPasswordValid(newPassword)) {
      toast({ title: 'Password does not meet all requirements', variant: 'destructive' })
      return
    }
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  const toggleNotifPref = (key: keyof NotifPrefs) => {
    const current = notifPrefs?.[key] ?? false
    updateNotifMutation.mutate({ [key]: !current })
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const editableFields = [
    { key: 'display_name', label: 'Display Name', value: profile?.display_name || user?.display_name || '' },
    { key: 'phone', label: 'Phone', value: profile?.phone || user?.phone || '' },
    { key: 'email', label: 'Email', value: profile?.email || user?.email || '' },
    { key: 'bio', label: 'Bio', value: profile?.bio || '' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {editableFields.map(field => (
            <div key={field.key} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-500">{field.label}</label>
                  {editingField === field.key ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      {field.key === 'bio' ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          rows={3}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      ) : field.key === 'phone' ? (
                        <div className="flex-1">
                          <PhoneInput
                            value={editValue}
                            onChange={setEditValue}
                            label=""
                          />
                        </div>
                      ) : (
                        <input
                          type={field.key === 'email' ? 'email' : 'text'}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      )}
                      <button
                        onClick={() => saveField(field.key)}
                        disabled={updateProfileMutation.isPending}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">
                      {field.value || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
                {editingField !== field.key && (
                  <button
                    onClick={() => startEditing(field.key, field.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="px-6 py-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-between w-full py-2 text-left group"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">Change Password</p>
              <p className="text-xs text-gray-500 mt-0.5">Update your password to keep your account secure</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition" />
          </button>
        </div>
      </div>

      {/* Role Management */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Role Management</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">
            Current role:{' '}
            <span className="font-medium text-primary capitalize">{activeRole || profile?.active_role || 'customer'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(roles.length > 0 ? roles : profile?.roles || ['customer', 'provider']).map(role => (
              <button
                key={role}
                onClick={() => switchRoleMutation.mutate(role)}
                disabled={switchRoleMutation.isPending || role === (activeRole || profile?.active_role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  role === (activeRole || profile?.active_role)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {notifLoading ? (
            <div className="px-6 py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : (
            [
              { key: 'email_notifications' as keyof NotifPrefs, label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'push_notifications' as keyof NotifPrefs, label: 'Push Notifications', desc: 'Browser push notifications' },
              { key: 'sms_notifications' as keyof NotifPrefs, label: 'SMS Notifications', desc: 'Receive SMS alerts' },
              { key: 'booking_updates' as keyof NotifPrefs, label: 'Booking Updates', desc: 'Get notified about booking changes' },
              { key: 'new_messages' as keyof NotifPrefs, label: 'New Messages', desc: 'Alerts for new messages' },
              { key: 'promotional' as keyof NotifPrefs, label: 'Promotional', desc: 'Deals and promotional content' },
            ].map(item => (
              <div key={item.key} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotifPref(item.key)}
                  disabled={updateNotifMutation.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifPrefs?.[item.key] ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      notifPrefs?.[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Data & Privacy</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Download My Data</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Export all your Jobsy data including profile, bookings, transactions, reviews, and messages. Limited to once per 24 hours.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition disabled:opacity-50 shrink-0"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-3">
            Permanently delete your account. Your personal data will be anonymized in compliance with data
            protection regulations. Transaction records are retained for legal compliance but with all
            personal identifiers removed. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    {passwordChecks(newPassword).map(check => (
                      <div key={check.label} className="flex items-center gap-1.5">
                        <Check className={`h-3.5 w-3.5 ${check.met ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-xs ${check.met ? 'text-green-600' : 'text-gray-400'}`}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending || (!!newPassword && !isPasswordValid(newPassword))}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Account?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete your account, profile, and all associated data.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleteAccountMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
