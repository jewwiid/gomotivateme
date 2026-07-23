import {
  // Activity-oriented categories
  HeartPulse,
  GraduationCap,
  Briefcase,
  Rocket,
  Palette,
  Flame,
  Dumbbell,
  HeartHandshake,
  Target,
  Plane,
  UsersRound,
  Church,
  CircleEllipsis,
  // Legacy (GoFundMe-shaped) icons — kept for backward compat
  Stethoscope,
  Siren,
  PawPrint,
  Leaf,
  Users,
  Trophy,
  Calendar,
  HandHeart,
  Sparkles,
  // Generic fallback
  LucideIcon,
} from "lucide-react";
import { getCategory } from "@/lib/categories";

const ICONS: Record<string, LucideIcon> = {
  // Activity-oriented
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  rocket: Rocket,
  palette: Palette,
  flame: Flame,
  dumbbell: Dumbbell,
  "heart-handshake": HeartHandshake,
  target: Target,
  plane: Plane,
  "users-round": UsersRound,
  church: Church,
  "circle-ellipsis": CircleEllipsis,
  // Legacy (still rendered if old goals use them)
  stethoscope: Stethoscope,
  siren: Siren,
  "paw-print": PawPrint,
  leaf: Leaf,
  users: Users,
  trophy: Trophy,
  calendar: Calendar,
  "hand-heart": HandHeart,
  sparkles: Sparkles,
};

export function CategoryIcon({
  category,
  className = "",
  size = 16,
}: {
  category: string;
  className?: string;
  size?: number;
}) {
  const cat = getCategory(category);
  const Icon = ICONS[cat.icon] ?? Sparkles;
  return <Icon className={className} size={size} aria-label={cat.label} />;
}
