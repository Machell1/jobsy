import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface Props {
  disabled?: boolean
  placeholder?: string
  onSubmit: (content: string) => void
  initialValue?: string
}

/**
 * Composer: auto-resizing textarea + send button.
 *
 * Enter sends, Shift+Enter inserts a newline. Max height 6 rows before
 * internal scroll so the composer never pushes the chat off screen.
 */
export default function Composer({ disabled, placeholder, onSubmit, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="flex items-end gap-2 rounded-2xl border border-gray-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-white transition-all px-3 py-2.5"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Message Jobsy Assistant…'}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent text-[15px] leading-[1.5] text-gray-900 placeholder-gray-400 outline-none disabled:opacity-60 max-h-[180px]"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="h-9 w-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white grid place-items-center transition-colors shrink-0"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </form>
  )
}
