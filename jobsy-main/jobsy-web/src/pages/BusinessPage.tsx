import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, ApiError } from '../lib/api'
import {
  Building2,
  Loader2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Users,
  Globe,
  Clock,
  CheckCircle,
} from 'lucide-react'
import PhoneInput from '../components/ui/PhoneInput'

interface Business {
  id: string
  name: string
  description?: string
  category?: string
  parish?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  is_verified?: boolean
  staff?: StaffMember[]
  branches?: Branch[]
  created_at?: string
}

interface StaffMember {
  id: string
  name: string
  role?: string
  email?: string
}

interface Branch {
  id: string
  name: string
  address?: string
  parish?: string
  phone?: string
}

export default function BusinessPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [registerForm, setRegisterForm] = useState({
    name: '',
    description: '',
    category: '',
    parish: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })

  const { data: business, isLoading, isError } = useQuery<Business | null>({
    queryKey: ['business', 'me'],
    queryFn: async () => {
      try {
        return await apiGet('/api/business/me', token)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!token,
  })

  const registerMutation = useMutation({
    mutationFn: (data: typeof registerForm) =>
      apiPost('/api/business/register', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      toast({ title: 'Business registered successfully!' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Registration failed',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Registration form when no business exists
  if (!business || isError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Register Your Business</h1>
            <p className="text-sm text-gray-500">Create a business profile to reach more customers</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form
            onSubmit={e => {
              e.preventDefault()
              registerMutation.mutate(registerForm)
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g., Kingston Plumbing Co."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={registerForm.description}
                onChange={e => setRegisterForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="What does your business do?"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={registerForm.category}
                  onChange={e => setRegisterForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g., Plumbing"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
                <input
                  type="text"
                  value={registerForm.parish}
                  onChange={e => setRegisterForm(f => ({ ...f, parish: e.target.value }))}
                  placeholder="e.g., Kingston"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={registerForm.address}
                onChange={e => setRegisterForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PhoneInput
                value={registerForm.phone}
                onChange={(v) => setRegisterForm(f => ({ ...f, phone: v }))}
                label="Phone"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="business@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={registerForm.website}
                onChange={e => setRegisterForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Register Business
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Business details view
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Business</h1>
          <p className="text-sm text-gray-500">Manage your business profile</p>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-green-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{business.name}</h2>
                {business.is_verified && (
                  <CheckCircle className="h-5 w-5 text-gold" />
                )}
              </div>
              {business.category && (
                <p className="text-sm text-white/80">{business.category}</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          {business.description && (
            <p className="text-sm text-gray-700 mb-4">{business.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {business.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                {business.address}
              </div>
            )}
            {business.parish && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                {business.parish}
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                {business.phone}
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                {business.email}
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {business.website}
                </a>
              </div>
            )}
            {business.created_at && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                Registered {new Date(business.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Staff</h2>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition">
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        </div>
        {!business.staff || business.staff.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No staff members added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {business.staff.map(member => (
              <div key={member.id} className="px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {member.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  {member.role && <p className="text-xs text-gray-500">{member.role}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branches */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition">
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
        </div>
        {!business.branches || business.branches.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No branches added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {business.branches.map(branch => (
              <div key={branch.id} className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-900">{branch.name}</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  {branch.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {branch.address}
                    </span>
                  )}
                  {branch.parish && <span>{branch.parish}</span>}
                  {branch.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {branch.phone}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
