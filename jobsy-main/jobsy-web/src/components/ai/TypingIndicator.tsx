import React from 'react'

export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-gray-100 text-gray-500">
      <span className="sr-only">Assistant is typing</span>
      <span className="block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '120ms' }} />
      <span className="block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '240ms' }} />
    </div>
  )
}
