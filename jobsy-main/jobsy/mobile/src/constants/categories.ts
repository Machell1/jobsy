export const SERVICE_CATEGORIES = [
  { key: "plumbing", label: "Plumbing", icon: "water" },
  { key: "electrical", label: "Electrical", icon: "flash" },
  { key: "carpentry", label: "Carpentry", icon: "hammer" },
  { key: "cleaning", label: "Cleaning", icon: "sparkles" },
  { key: "gardening", label: "Gardening", icon: "leaf" },
  { key: "painting", label: "Painting", icon: "color-palette" },
  { key: "masonry", label: "Masonry", icon: "construct" },
  { key: "roofing", label: "Roofing", icon: "home" },
  { key: "automotive", label: "Automotive", icon: "car" },
  { key: "catering", label: "Catering", icon: "restaurant" },
  { key: "tutoring", label: "Tutoring", icon: "school" },
  { key: "beauty", label: "Beauty", icon: "cut" },
  { key: "tailoring", label: "Tailoring", icon: "shirt" },
  { key: "moving", label: "Moving", icon: "cube" },
  { key: "tech_repair", label: "Tech Repair", icon: "phone-portrait" },
  { key: "photography", label: "Photography", icon: "camera" },
  { key: "event_planning", label: "Event Planning", icon: "calendar" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal" },
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]["key"];
