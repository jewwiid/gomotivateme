import {
  Scale,
  Dumbbell,
  BookOpen,
  Repeat,
  Palette,
  Briefcase,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import { getCategory } from "@/lib/categories";

const ICONS: Record<string, LucideIcon> = {
  scale: Scale,
  dumbbell: Dumbbell,
  book: BookOpen,
  repeat: Repeat,
  palette: Palette,
  briefcase: Briefcase,
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
