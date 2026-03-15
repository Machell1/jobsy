import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, ApiError } from '../lib/api'
import {
  ShoppingBag,
  Loader2,
  Plus,
  DollarSign,
  MapPin,
  Clock,
  X,
  Tag,
  Grid3X3,
} from 'lucide-react'

interface Listing {
  id: string
  title: string
  description?: string
  price?: number
  currency?: string
  category?: string
  parish?: string
  status?: string
  image_url?: string
  created_at?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function ListingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [listingForm, setListingForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    parish: '',
  })

  const { data, isLoading } = useQuery<Listing[]>({
    queryKey: ['listings'],
    queryFn: async () => {
      const res = await apiGet('/api/listings', token)
      return Array.isArray(res) ? res : res?.items || res?.listings || []
    },
    enabled: !!token,
  })

  const createMutation = useMutation({
    mutationFn: (formData: typeof listingForm) =>
      apiPost('/api/listings', {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast({ title: 'Listing created!' })
      setShowCreateModal(false)
      setListingForm({ title: '', description: '', price: '', category: '', parish: '' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to create listing',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const listings = data || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
            <p className="text-sm text-gray-500">Browse and create service listings</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Create Listing
        </button>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Grid3X3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No listings yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first listing to showcase your services
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => (
            <div
              key={listing.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {listing.image_url ? (
                <div className="w-full h-40 bg-gray-100">
                  <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-primary/5 to-green-50 flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-gray-300" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{listing.title}</h3>
                  {listing.price != null && (
                    <span className="inline-flex items-center gap-0.5 text-sm font-bold text-gold shrink-0">
                      <DollarSign className="h-3.5 w-3.5" />
                      {listing.price.toLocaleString()}
                    </span>
                  )}
                </div>
                {listing.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-400">
                  {listing.category && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      <Tag className="h-3 w-3" />
                      {listing.category}
                    </span>
                  )}
                  {listing.parish && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {listing.parish}
                    </span>
                  )}
                  {(listing.created_at) && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(listing.created_at)}
                    </span>
                  )}
                </div>
                {listing.status && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    listing.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {listing.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Listing</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                createMutation.mutate(listingForm)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={listingForm.title}
                  onChange={e => setListingForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g., Professional Plumbing Services"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={listingForm.description}
                  onChange={e => setListingForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe your service in detail..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (JMD)</label>
                  <input
                    type="number"
                    value={listingForm.price}
                    onChange={e => setListingForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={listingForm.category}
                    onChange={e => setListingForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g., Plumbing"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
                <input
                  type="text"
                  value={listingForm.parish}
                  onChange={e => setListingForm(f => ({ ...f, parish: e.target.value }))}
                  placeholder="e.g., Kingston"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
