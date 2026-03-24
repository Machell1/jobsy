"use client";

import twemoji from "@twemoji/api";

export function Emoji({
  emoji,
  size = 20,
  label,
  className = "",
}: {
  emoji: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  const html = twemoji.parse(emoji, {
    folder: "svg",
    ext: ".svg",
    base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14/assets/",
    attributes: () => ({
      width: `${size}`,
      height: `${size}`,
      style: "display:inline-block;vertical-align:middle",
      "aria-label": label ?? emoji,
      role: "img",
    }),
  });
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
