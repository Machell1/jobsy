import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, apiDelete, ApiError } from '../lib/api'
import {
  Megaphone,
  Plus,
  X,
  Heart,
  MessageCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Hash,
  Image,
  Send,
  Clock,
  User,
} from 'lucide-react'

interface Post {
  id: string
  author_id: string
  author_name?: string
  content: string
  media_url?: string
  hashtags?: string[]
  external_link?: string
  likes_count: number
  comments_count: number
  is_liked?: boolean
  created_at?: string
  comments?: Comment[]
}

interface Comment {
  id: string
  author_id: string
  author_name?: string
  content: string
  created_at?: string
}

async function createPostWithAutoBoard(
  postData: Record<string, unknown>,
  token: string | null
) {
  try {
    return await apiPost('/api/noticeboard/posts', postData, token)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Auto-create board then retry
      await apiPost(
        '/api/noticeboard/boards',
        { name: 'General', description: 'Community noticeboard' },
        token
      )
      return await apiPost('/api/noticeboard/posts', postData, token)
    }
    throw err
  }
}

export default function NoticeboardPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentText, setCommentText] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    content: '',
    media_url: '',
    hashtags: '',
    external_link: '',
  })

  // Fetch posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['noticeboard', 'feed'],
    queryFn: () => apiGet('/api/noticeboard/posts/feed', token),
    enabled: !!token,
  })

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload: Record<string, unknown> = { content: data.content }
      if (data.media_url.trim()) payload.media_url = data.media_url.trim()
      if (data.hashtags.trim()) {
        payload.hashtags = data.hashtags.split(',').map(t => t.trim()).filter(Boolean)
      }
      if (data.external_link.trim()) payload.external_link = data.external_link.trim()
      return createPostWithAutoBoard(payload, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticeboard'] })
      toast({ title: 'Post created' })
      setShowCreateForm(false)
      setFormData({ content: '', media_url: '', hashtags: '', external_link: '' })
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to create post', description: detail, variant: 'destructive' })
    },
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => apiDelete(`/api/noticeboard/posts/${postId}`, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticeboard'] })
      toast({ title: 'Post deleted' })
      setSelectedPost(null)
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to delete post', description: detail, variant: 'destructive' })
    },
  })

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        return apiDelete(`/api/noticeboard/like`, token)
      }
      return apiPost('/api/noticeboard/like', { target_type: 'post', target_id: postId }, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticeboard'] })
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Action failed', description: detail, variant: 'destructive' })
    },
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiPost(`/api/noticeboard/posts/${postId}/comments`, { content }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticeboard'] })
      setCommentText('')
      toast({ title: 'Comment added' })
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to add comment', description: detail, variant: 'destructive' })
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim()) {
      toast({ title: 'Please write some content', variant: 'destructive' })
      return
    }
    createPostMutation.mutate(formData)
  }

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault()
    if (!commentText.trim()) return
    addCommentMutation.mutate({ postId, content: commentText.trim() })
  }

  const formatTimestamp = (ts?: string) => {
    if (!ts) return ''
    try {
      const date = new Date(ts)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            Noticeboard
          </h1>
          <p className="text-gray-600 text-sm mt-1">Community posts and updates</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Create Post Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What's on your mind? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share something with the community..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" /> Media URL
                </label>
                <input
                  type="url"
                  value={formData.media_url}
                  onChange={e => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" /> Hashtags
                </label>
                <input
                  type="text"
                  value={formData.hashtags}
                  onChange={e => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" /> External Link
                </label>
                <input
                  type="url"
                  value={formData.external_link}
                  onChange={e => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createPostMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts Feed */}
      {postsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
          <p className="text-gray-500 text-sm">
            Be the first to share something with the community!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition"
            >
              {/* Post header */}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {post.author_name || 'Community Member'}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(post.created_at)}
                      </p>
                    </div>
                  </div>
                  {user?.id === post.author_id && (
                    <button
                      onClick={() => deletePostMutation.mutate(post.id)}
                      disabled={deletePostMutation.isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p
                  className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  {post.content}
                </p>
              </div>

              {/* Media */}
              {post.media_url && (
                <div className="px-4 pb-2">
                  <img
                    src={post.media_url}
                    alt="Post media"
                    className="rounded-lg max-h-64 w-full object-cover border border-gray-100"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Hashtags & Link */}
              {((post.hashtags && post.hashtags.length > 0) || post.external_link) && (
                <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
                  {post.hashtags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                  {post.external_link && (
                    <a
                      href={post.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Link
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={() => likeMutation.mutate({ postId: post.id, isLiked: !!post.is_liked })}
                  disabled={likeMutation.isPending}
                  className={`flex items-center gap-1.5 text-sm transition ${
                    post.is_liked
                      ? 'text-red-500 font-medium'
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                  {post.likes_count || 0}
                </button>
                <button
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Post</h2>
              <button
                onClick={() => { setSelectedPost(null); setCommentText('') }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Post content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPost.author_name || 'Community Member'}
                  </p>
                  <p className="text-xs text-gray-400">{formatTimestamp(selectedPost.created_at)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selectedPost.content}
              </p>

              {selectedPost.media_url && (
                <img
                  src={selectedPost.media_url}
                  alt="Post media"
                  className="rounded-lg max-h-64 w-full object-cover border border-gray-100"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}

              {((selectedPost.hashtags && selectedPost.hashtags.length > 0) || selectedPost.external_link) && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedPost.hashtags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                  {selectedPost.external_link && (
                    <a
                      href={selectedPost.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      External Link
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 py-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {selectedPost.likes_count || 0} likes
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {selectedPost.comments_count || 0} comments
                </span>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Comments</h3>
                {selectedPost.comments && selectedPost.comments.length > 0 ? (
                  selectedPost.comments.map((comment: Comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {comment.author_name || 'User'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
                )}
              </div>
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-gray-200 shrink-0">
              <form
                onSubmit={e => handleCommentSubmit(e, selectedPost.id)}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="p-2.5 rounded-lg bg-primary hover:bg-green-700 text-white transition disabled:opacity-50"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
