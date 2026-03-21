import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../lib/api'
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Settings,
  Star,
  Users,
  Briefcase,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Image,
  ExternalLink,
  Camera,
} from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import MediaUpload from '../components/MediaUpload'

interface Profile {
  id: string
  display_name?: string
  bio?: string
  phone?: string
  email?: string
  active_role?: string
  is_verified?: boolean
  avatar_url?: string
  followers_count?: number
  following_count?: number
  reviews_count?: number
}

interface PortfolioItem {
  id: string
  title: string
  description?: string
  image_url?: string
  video_url?: string
  link?: string
}

interface Service {
  id: string
  title: string
  description?: string
  price?: number
  category?: string
}

interface Availability {
  day: string
  start_time?: string
  end_time?: string
  is_available?: boolean
}

export default function ProfilePage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null)
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', image_url: '', video_url: '', link: '' })
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['profile', 'me'],
    queryFn: () => apiGet('/api/profiles/me', token),
    enabled: !!token,
  })

  const { data: portfolio = [] } = useQuery<PortfolioItem[]>({
    queryKey: ['portfolio'],
    queryFn: () => apiGet('/api/profiles/me/portfolio', token),
    enabled: !!token,
  })

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['my-services'],
    queryFn: () => apiGet('/api/profiles/services/mine', token),
    enabled: !!token,
  })

  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: ['availability'],
    queryFn: () => apiGet('/api/profiles/availability/me', token),
    enabled: !!token,
  })

  const addPortfolioMutation = useMutation({
    mutationFn: (data: typeof portfolioForm) =>
      apiPost('/api/profiles/me/portfolio', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      toast({ title: 'Portfolio item added' })
      closePortfolioModal()
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to add item',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const updatePortfolioMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof portfolioForm }) =>
      apiPut(`/api/profiles/me/portfolio/${id}`, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      toast({ title: 'Portfolio item updated' })
      closePortfolioModal()
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update item',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/profiles/me/portfolio/${id}`, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      toast({ title: 'Portfolio item removed' })
    },
    onError: () => {
      toast({ title: 'Failed to remove item', variant: 'destructive' })
    },
  })

  const closePortfolioModal = () => {
    setShowPortfolioModal(false)
    setEditingPortfolio(null)
    setPortfolioForm({ title: '', description: '', image_url: '', video_url: '', link: '' })
  }

  const openAddPortfolio = () => {
    setPortfolioForm({ title: '', description: '', image_url: '', video_url: '', link: '' })
    setEditingPortfolio(null)
    setShowPortfolioModal(true)
  }

  const openEditPortfolio = (item: PortfolioItem) => {
    setPortfolioForm({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || '',
      video_url: item.video_url || '',
      link: item.link || '',
    })
    setEditingPortfolio(item)
    setShowPortfolioModal(true)
  }

  const handlePortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingPortfolio) {
      updatePortfolioMutation.mutate({ id: editingPortfolio.id, data: portfolioForm })
    } else {
      addPortfolioMutation.mutate(portfolioForm)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-green-700 h-32" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Avatar */}
            <div className="relative group/avatar">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => setShowAvatarUpload(true)}
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover/avatar:opacity-100 transition"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.display_name || user?.display_name || 'User'}
                </h1>
                {profile?.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    <XCircle className="h-3 w-3" />
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 capitalize mt-0.5">
                {profile?.active_role || user?.active_role || 'customer'}
              </p>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
            >
              <Settings className="h-4 w-4" />
              Edit Profile
            </Link>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-4 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          )}

          {/* Contact Info */}
          <div className="mt-4 flex flex-wrap gap-4">
            {(profile?.phone || user?.phone) && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {profile?.phone || user?.phone}
              </span>
            )}
            {profile?.email && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                {profile.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Followers', value: profile?.followers_count ?? 0, icon: Users },
          { label: 'Following', value: profile?.following_count ?? 0, icon: Users },
          { label: 'Reviews', value: profile?.reviews_count ?? 0, icon: Star },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Portfolio */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Portfolio</h2>
          </div>
          <button
            onClick={openAddPortfolio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
        {portfolio.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Image className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No portfolio items yet</p>
            <button
              onClick={openAddPortfolio}
              className="mt-2 text-sm text-primary font-medium hover:underline"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {portfolio.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 group relative">
                {item.video_url ? (
                  <div className="w-full h-40 rounded-lg bg-gray-900 mb-3 overflow-hidden relative">
                    <video
                      src={item.video_url}
                      className="w-full h-full object-contain"
                      muted
                      playsInline
                      preload="metadata"
                      poster={item.image_url || undefined}
                      controls
                    />
                  </div>
                ) : item.image_url ? (
                  <div className="w-full h-40 rounded-lg bg-gray-100 mb-3 overflow-hidden">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                )}
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={() => openEditPortfolio(item)}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => deletePortfolioMutation.mutate(item.id)}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Services</h2>
        </div>
        {services.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No services listed</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {services.map(service => (
              <div key={service.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{service.title}</h3>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                    )}
                    {service.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {service.category}
                      </span>
                    )}
                  </div>
                  {service.price != null && (
                    <span className="text-sm font-semibold text-gold">${service.price.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
        </div>
        {availability.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No availability set</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {availability.map((slot, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 capitalize w-24">{slot.day}</span>
                {slot.is_available !== false ? (
                  <span className="text-sm text-gray-600">
                    {slot.start_time || '9:00 AM'} - {slot.end_time || '5:00 PM'}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Unavailable</span>
                )}
                <span className={`w-2 h-2 rounded-full ${slot.is_available !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Update Profile Photo</h3>
              <button onClick={() => setShowAvatarUpload(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <ImageUpload
              folder="avatars"
              label="Upload a profile photo"
              currentImage={profile?.avatar_url || undefined}
              onUpload={(url) => {
                apiPut('/api/profiles/me', { avatar_url: url }, token).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
                  toast({ title: 'Profile photo updated' })
                  setShowAvatarUpload(false)
                }).catch(() => {
                  toast({ title: 'Failed to update photo', variant: 'destructive' })
                })
              }}
            />
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPortfolio ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
              </h3>
              <button onClick={closePortfolioModal} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handlePortfolioSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={portfolioForm.title}
                  onChange={e => setPortfolioForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={portfolioForm.description}
                  onChange={e => setPortfolioForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media</label>
                <MediaUpload
                  type="both"
                  folder="portfolio"
                  label="Upload image or video"
                  currentImage={portfolioForm.image_url || undefined}
                  currentVideo={portfolioForm.video_url || undefined}
                  onUpload={(url, thumbnailUrl) => {
                    const isVideo = /\.(mp4|mov|webm)$/i.test(url) || url.includes('/video/')
                    if (isVideo) {
                      setPortfolioForm(f => ({ ...f, video_url: url, image_url: thumbnailUrl || f.image_url }))
                    } else {
                      setPortfolioForm(f => ({ ...f, image_url: url }))
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                <input
                  type="url"
                  value={portfolioForm.link}
                  onChange={e => setPortfolioForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePortfolioModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPortfolioMutation.isPending || updatePortfolioMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {(addPortfolioMutation.isPending || updatePortfolioMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingPortfolio ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
