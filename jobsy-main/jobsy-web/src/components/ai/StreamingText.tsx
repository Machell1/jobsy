import React from 'react'

interface Props {
  text: string
  streaming?: boolean
}

/**
 * Renders chat text with a blinking caret while streaming.
 *
 * Keeps markdown-like formatting minimal:
 *  - newlines become <br>
 *  - anything else renders as-is
 *
 * We deliberately avoid a full markdown renderer here so we can't be tricked
 * into rendering HTML from a streamed payload. If the product needs real
 * markdown later, swap this for react-markdown with rehype-sanitize.
 */
export default function StreamingText({ text, streaming }: Props) {
  const parts = text.split('\n')
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < parts.length - 1 && <br />}
        </React.Fragment>
      ))}
      {streaming && <span className="inline-block w-[2px] h-[1em] bg-emerald-600 align-[-0.2em] ml-0.5 animate-pulse" />}
    </span>
  )
}
