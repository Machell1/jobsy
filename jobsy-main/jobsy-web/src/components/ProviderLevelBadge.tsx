import { Star } from 'lucide-react'

const LEVELS = [
  { name: 'New', color: 'bg-gray-100 text-gray-700 border-gray-300', starColor: 'text-gray-400' },
  { name: 'Rising', color: 'bg-green-100 text-green-700 border-green-300', starColor: 'text-green-500' },
  { name: 'Established', color: 'bg-blue-100 text-blue-700 border-blue-300', starColor: 'text-blue-500' },
  { name: 'Expert', color: 'bg-purple-100 text-purple-700 border-purple-300', starColor: 'text-purple-500' },
  { name: 'Elite', color: 'bg-yellow-50 text-yellow-800 border-yellow-400', starColor: 'text-yellow-500' },
] as const

const SIZES = {
  sm: { badge: 'px-1.5 py-0.5 text-[10px] gap-0.5', icon: 'h-2.5 w-2.5' },
  md: { badge: 'px-2 py-0.5 text-xs gap-1', icon: 'h-3 w-3' },
  lg: { badge: 'px-2.5 py-1 text-sm gap-1.5', icon: 'h-4 w-4' },
} as const

interface ProviderLevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

export default function ProviderLevelBadge({ level, size = 'md' }: ProviderLevelBadgeProps) {
  const idx = Math.max(0, Math.min(4, level - 1))
  const lvl = LEVELS[idx]
  const s = SIZES[size]

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${lvl.color} ${s.badge}`}
      title={`Level ${level}: ${lvl.name}`}
    >
      <Star className={`${s.icon} ${lvl.starColor} fill-current`} />
      {lvl.name}
    </span>
  )
}

export { LEVELS }
