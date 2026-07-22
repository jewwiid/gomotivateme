import {
  // New (GoFundMe-shaped) categories
  Stethoscope,
  Flame,
  Siren,
  HeartHandshake,
  GraduationCap,
  PawPrint,
  Leaf,
  Briefcase,
  Users,
  Trophy,
  Palette,
  Calendar,
  Church,
  UsersRound,
  Dumbbell,
  Plane,
  HandHeart,
  Sparkles,
  // Generic fallback
  LucideIcon,
} from "lucide-react";
import { getCategory } from "@/lib/categories";

const ICONS: Record<string, LucideIcon> = {
  // GoFundMe-shaped
  stethoscope: Stethoscope,
  flame: Flame,
  siren: Siren,
  "heart-handshake": HeartHandshake,
  "graduation-cap": GraduationCap,
  "paw-print": PawPrint,
  leaf: Leaf,
  briefcase: Briefcase,
  users: Users,
  trophy: Trophy,
  palette: Palette,
  calendar: Calendar,
  church: Church,
  "users-round": UsersRound,
  dumbbell: Dumbbell,
  plane: Plane,
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
