import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiPost, ApiError } from '../lib/api'
import ImageUpload from '../components/ImageUpload'
import {
  Calendar,
  ArrowLeft,
  Loader2,
  MapPin,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  Tag,
  Info,
} from 'lucide-react'

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
  'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
  'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]

const CATEGORIES = [
  'Music & Concerts', 'Food & Drink', 'Arts & Culture', 'Sports & Fitness',
  'Business & Networking', 'Community', 'Education', 'Nightlife & Parties',
  'Family & Kids', 'Health & Wellness', 'Religion & Spirituality', 'Other',
]

export default function CreateEventPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const showError = (field: string, isEmpty: boolean) => {
    return isEmpty && (hasSubmitted || touched[field])
  }

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    cover_image_url: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location_text: '',
    parish: '',
    is_free: true,
    ticket_price: '',
    currency: 'JMD',
    capacity: '',
    age_restriction: '',
    tags: '',
  })

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost('/api/events', payload, token),
    onSuccess: (data: { id: string }) => {
      toast({ title: 'Event created successfully!' })
      navigate(`/events/${data.id}`)
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to create event', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setHasSubmitted(true)
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return }
    if (!form.start_date || !form.start_time) { toast({ title: 'Start date and time are required', variant: 'destructive' }); return }

    const startDateTime = `${form.start_date}T${form.start_time}:00`
    const endDateTime = form.end_date && form.end_time ? `${form.end_date}T${form.end_time}:00` : undefined

    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      cover_image_url: form.cover_image_url || undefined,
      start_date: startDateTime,
      end_date: endDateTime,
      location_text: form.location_text.trim() || undefined,
      parish: form.parish || undefined,
      is_free: form.is_free,
      ticket_price: !form.is_free && form.ticket_price ? parseFloat(form.ticket_price) : undefined,
      currency: form.currency,
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      age_restriction: form.age_restriction || undefined,
      tags,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/events')} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Post an Event
          </h1>
          <p className="text-sm text-gray-500">Share your event with the Jobsy community</p>
        </div>
      </div>

      {/* Fee notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Event Posting Fee</p>
          <p className="text-xs text-amber-600 mt-0.5">Posting an event costs J$500. This helps keep the platform quality high.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <ImageUpload
            folder="events"
            onUpload={(url) => updateField('cover_image_url', url)}
            currentImage={form.cover_image_url || undefined}
            label="Upload event cover image"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => updateField('title', e.target.value)}
            onBlur={() => markTouched('title')}
            placeholder="e.g. Summer Reggae Fest 2026"
            maxLength={300}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${showError('title', !form.title.trim()) ? 'border-red-500' : 'border-gray-300'}`}
          />
          {showError('title', !form.title.trim()) && <p className="mt-1 text-xs text-red-500">Title is required</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
            placeholder="Tell people what your event is about..."
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Tag className="inline h-4 w-4 mr-1" />
            Category
          </label>
          <select
            value={form.category}
            onChange={e => updateField('category', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" />
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => updateField('start_date', e.target.value)}
              onBlur={() => markTouched('start_date')}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${showError('start_date', !form.start_date) ? 'border-red-500' : 'border-gray-300'}`}
            />
            {showError('start_date', !form.start_date) && <p className="mt-1 text-xs text-red-500">Start date is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={form.start_time}
              onChange={e => updateField('start_time', e.target.value)}
              onBlur={() => markTouched('start_time')}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${showError('start_time', !form.start_time) ? 'border-red-500' : 'border-gray-300'}`}
            />
            {showError('start_time', !form.start_time) && <p className="mt-1 text-xs text-red-500">Start time is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => updateField('end_date', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={e => updateField('end_time', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="inline h-4 w-4 mr-1" />
            Location
          </label>
          <input
            type="text"
            value={form.location_text}
            onChange={e => updateField('location_text', e.target.value)}
            placeholder="e.g. National Stadium, Kingston"
            maxLength={500}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Parish */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
          <select
            value={form.parish}
            onChange={e => updateField('parish', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">Select parish</option>
            {PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Pricing */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={e => updateField('is_free', e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">This is a free event</span>
            </label>
          </div>

          {!form.is_free && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ticket Price</label>
                <input
                  type="number"
                  value={form.ticket_price}
                  onChange={e => updateField('ticket_price', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => updateField('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="JMD">JMD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Capacity & Age Restriction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="inline h-4 w-4 mr-1" />
              Capacity Limit
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={e => updateField('capacity', e.target.value)}
              placeholder="Leave empty for unlimited"
              min="1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              Age Restriction
            </label>
            <select
              value={form.age_restriction}
              onChange={e => updateField('age_restriction', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">No restriction</option>
              <option value="18+">18+</option>
              <option value="21+">21+</option>
              <option value="All ages">All ages</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={form.tags}
            onChange={e => updateField('tags', e.target.value)}
            placeholder="reggae, dancehall, food (comma-separated)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Calendar className="h-5 w-5" />
          )}
          {createMutation.isPending ? 'Creating...' : 'Post Event'}
        </button>
      </form>
    </div>
  )
}
