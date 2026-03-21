import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiUpload } from '../lib/api'
import { Upload, Camera, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  folder?: string
  onUpload: (url: string, thumbnailUrl?: string) => void
  className?: string
  maxWidthPx?: number
  quality?: number
  accept?: string
  label?: string
  currentImage?: string
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

export default function ImageUpload({
  folder = 'listings',
  onUpload,
  className = '',
  maxWidthPx = 1200,
  quality = 0.8,
  accept = 'image/jpeg,image/png,image/webp',
  label = 'Upload Image',
  currentImage,
}: ImageUploadProps) {
  const { token } = useAuth()
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError('Please select a JPG, PNG, or WebP image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }
    setError(null)

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)

    // Compress
    setUploading(true)
    setProgress(0)
    try {
      const compressed = await compressImage(file, maxWidthPx, quality)
      const result = await apiUpload('/api/storage/upload', compressed, folder, token, setProgress)
      onUpload(result.url, result.thumbnail_url || undefined)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [folder, token, onUpload, maxWidthPx, quality])

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
    setError(null)
  }

  const displayImage = preview || currentImage

  return (
    <div className={className}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />

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
      ) : (
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
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-xs text-gray-400 mt-1">
            Drag & drop or click to browse. JPG, PNG, WebP (max 10MB)
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!displayImage && (
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
