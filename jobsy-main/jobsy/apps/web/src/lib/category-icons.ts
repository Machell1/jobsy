import {
  Droplets,
  Zap,
  Hammer,
  Sparkles,
  Leaf,
  Paintbrush,
  Landmark,
  Home,
  Car,
  UtensilsCrossed,
  GraduationCap,
  Scissors,
  Shirt,
  Truck,
  Smartphone,
  Camera,
  CalendarDays,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type Category =
  | "Plumbing"
  | "Electrical"
  | "Carpentry"
  | "Cleaning"
  | "Gardening"
  | "Painting"
  | "Masonry"
  | "Roofing"
  | "Automotive"
  | "Catering"
  | "Tutoring"
  | "Beauty"
  | "Tailoring"
  | "Moving"
  | "Tech Repair"
  | "Photography"
  | "Event Planning"
  | "Other";

export interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  hex: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  Plumbing: {
    icon: Droplets,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    gradient: "from-sky-500 to-sky-700",
    hex: "#0284C7",
  },
  Electrical: {
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    gradient: "from-amber-500 to-amber-700",
    hex: "#D97706",
  },
  Carpentry: {
    icon: Hammer,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    gradient: "from-orange-600 to-orange-800",
    hex: "#C2410C",
  },
  Cleaning: {
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    gradient: "from-violet-500 to-violet-700",
    hex: "#7C3AED",
  },
  Gardening: {
    icon: Leaf,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-700",
    hex: "#059669",
  },
  Painting: {
    icon: Paintbrush,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    gradient: "from-rose-500 to-rose-700",
    hex: "#E11D48",
  },
  Masonry: {
    icon: Landmark,
    color: "text-stone-600",
    bg: "bg-stone-50",
    border: "border-stone-200",
    gradient: "from-stone-500 to-stone-700",
    hex: "#78716C",
  },
  Roofing: {
    icon: Home,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    gradient: "from-teal-500 to-teal-700",
    hex: "#0D9488",
  },
  Automotive: {
    icon: Car,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    gradient: "from-blue-500 to-blue-700",
    hex: "#2563EB",
  },
  Catering: {
    icon: UtensilsCrossed,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    gradient: "from-red-500 to-red-700",
    hex: "#DC2626",
  },
  Tutoring: {
    icon: GraduationCap,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    gradient: "from-indigo-500 to-indigo-700",
    hex: "#4F46E5",
  },
  Beauty: {
    icon: Scissors,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    gradient: "from-pink-500 to-pink-700",
    hex: "#DB2777",
  },
  Tailoring: {
    icon: Shirt,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    gradient: "from-purple-500 to-purple-700",
    hex: "#9333EA",
  },
  Moving: {
    icon: Truck,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    gradient: "from-cyan-500 to-cyan-700",
    hex: "#0891B2",
  },
  "Tech Repair": {
    icon: Smartphone,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    gradient: "from-slate-500 to-slate-700",
    hex: "#475569",
  },
  Photography: {
    icon: Camera,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-200",
    gradient: "from-fuchsia-500 to-fuchsia-700",
    hex: "#C026D3",
  },
  "Event Planning": {
    icon: CalendarDays,
    color: "text-lime-600",
    bg: "bg-lime-50",
    border: "border-lime-200",
    gradient: "from-lime-500 to-lime-700",
    hex: "#65A30D",
  },
  Other: {
    icon: MoreHorizontal,
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    gradient: "from-gray-500 to-gray-700",
    hex: "#4B5563",
  },
};
