import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiUpload } from '../lib/api'
import { Upload, Camera, X, Loader2, Image as ImageIcon, Film, Play } from 'lucide-react'

const IMAGE_EXTENSIONS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_EXTENSIONS = ['video/mp4', 'video/quicktime', 'video/webm']
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm'
const BOTH_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

interface MediaUploadProps {
  type?: 'image' | 'video' | 'both'
  folder?: string
  onUpload: (url: string, thumbnailUrl?: string) => void
  className?: string
  maxWidthPx?: number
  quality?: number
  accept?: string
  label?: string
  currentImage?: string
  currentVideo?: string
}

function isVideoFile(file: File): boolean {
  return VIDEO_EXTENSIONS.includes(file.type)
}

function isImageFile(file: File): boolean {
  return IMAGE_EXTENSIONS.includes(file.type)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= maxWidth) {
        resolve(file)
        return
      }
      const ratio = maxWidth / width
      width = maxWidth
      height = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: mimeType }))
          } else {
            resolve(file)
          }
        },
        mimeType,
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export default function MediaUpload({
  type = 'both',
  folder = 'listings',
  onUpload,
  className = '',
  maxWidthPx = 1200,
  quality = 0.8,
  accept,
  label,
  currentImage,
  currentVideo,
}: MediaUploadProps) {
  const { token } = useAuth()
  const [preview, setPreview] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const resolvedAccept = accept ?? (
    type === 'image' ? IMAGE_ACCEPT :
    type === 'video' ? VIDEO_ACCEPT :
    BOTH_ACCEPT
  )

  const resolvedLabel = label ?? (
    type === 'image' ? 'Upload Image' :
    type === 'video' ? 'Upload Video' :
    'Upload Image or Video'
  )

  const allowedTypes = (
    type === 'image' ? IMAGE_EXTENSIONS :
    type === 'video' ? VIDEO_EXTENSIONS :
    [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
  )

  const handleFile = useCallback(async (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      const typeLabel = type === 'image' ? 'JPG, PNG, WebP, or GIF image'
        : type === 'video' ? 'MP4, MOV, or WebM video'
        : 'JPG, PNG, WebP, GIF image or MP4, MOV, WebM video'
      setError(`Please select a ${typeLabel}`)
      return
    }

    const isVideo = isVideoFile(file)
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      setError(`File must be under ${formatFileSize(maxSize)}`)
      return
    }
    setError(null)

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    setPreviewType(isVideo ? 'video' : 'image')
    setFileSize(file.size)

    // Upload
    setUploading(true)
    setProgress(0)
    try {
      const uploadFile = isVideo ? file : await compressImage(file, maxWidthPx, quality)
      const result = await apiUpload('/api/storage/upload', uploadFile, folder, token, setProgress)
      onUpload(result.url, result.thumbnail_url || undefined)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(null)
      setPreviewType('image')
      setFileSize(null)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [folder, token, onUpload, maxWidthPx, quality, allowedTypes, type])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setPreviewType('image')
    setError(null)
    setFileSize(null)
  }

  const hasCurrentMedia = currentImage || currentVideo
  const displayImage = previewType === 'image' ? (preview || currentImage) : null
  const displayVideo = previewType === 'video' ? (preview || currentVideo) : null

  const formatHint = (
    type === 'image' ? 'JPG, PNG, WebP, GIF (max 10MB)'
    : type === 'video' ? 'MP4, MOV, WebM (max 100MB)'
    : 'Images: JPG, PNG, WebP, GIF (max 10MB) | Videos: MP4, MOV, WebM (max 100MB)'
  )

  return (
    <div className={className}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={resolvedAccept}
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={type === 'video' ? 'video/*' : 'image/*'}
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Image preview */}
      {displayImage ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={displayImage}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
              <div className="w-3/4 bg-white/30 rounded-full h-2">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white text-xs mt-1">{progress}%</span>
            </div>
          )}
          {!uploading && (
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow hover:bg-white transition"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      ) : displayVideo ? (
        /* Video preview */
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
          <video
            ref={videoRef}
            src={displayVideo}
            className="w-full h-48 object-contain bg-black"
            controls={false}
            muted
            playsInline
            preload="metadata"
          />
          {/* Play button overlay */}
          {!uploading && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.controls = true
                    videoRef.current.play()
                  } else {
                    videoRef.current.pause()
                  }
                }
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition"
            >
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-gray-800 ml-0.5" />
              </div>
            </button>
          )}
          {/* File size badge */}
          {fileSize && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
              {formatFileSize(fileSize)}
            </span>
          )}
          {/* Upload progress overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
              <div className="w-3/4 bg-white/30 rounded-full h-2">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white text-xs mt-1">Uploading... {progress}%</span>
              {fileSize && (
                <span className="text-white/70 text-xs mt-0.5">{formatFileSize(fileSize)}</span>
              )}
            </div>
          )}
          {!uploading && (
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow hover:bg-white transition z-10"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {(type === 'image' || type === 'both') && (
              <ImageIcon className="h-7 w-7 text-gray-400" />
            )}
            {(type === 'video' || type === 'both') && (
              <Film className="h-7 w-7 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 font-medium">{resolvedLabel}</p>
          <p className="text-xs text-gray-400 mt-1">
            Drag & drop or click to browse. {formatHint}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!displayImage && !displayVideo && !hasCurrentMedia && (
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            Browse Files
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition md:hidden"
          >
            <Camera className="h-3.5 w-3.5" />
            Camera
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
