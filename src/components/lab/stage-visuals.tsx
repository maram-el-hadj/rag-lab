import { Binary, Database, FileText, MessageSquare, Search, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Stage images go here (stage id -> image URL). Until then, icons are shown.
export const STAGE_IMAGES: Partial<Record<number, string>> = {};

export const STAGE_ICONS: LucideIcon[] = [Wrench, FileText, Binary, Database, Search, Sparkles, MessageSquare];

export const STAGE_BG = ["bg-stage-0", "bg-stage-1", "bg-stage-2", "bg-stage-3", "bg-stage-4", "bg-stage-5", "bg-stage-6"];
export const STAGE_TEXT = ["text-stage-0", "text-stage-1", "text-stage-2", "text-stage-3", "text-stage-4", "text-stage-5", "text-stage-6"];

export function StageBadge({ id, className, iconClass }: { id: number; className?: string; iconClass?: string }) {
  const img = STAGE_IMAGES[id];
  const Icon = STAGE_ICONS[id] ?? Wrench;
  if (img) return <img src={img} alt="" className={cn("rounded-full object-cover", className)} />;
  return (
    <span className={cn("grid place-items-center rounded-full text-primary-foreground", STAGE_BG[id], className)}>
      <Icon className={cn("size-1/2", iconClass)} strokeWidth={2.2} />
    </span>
  );
}

export function StageHero({ id, className }: { id: number; className?: string }) {
  const img = STAGE_IMAGES[id];
  if (img) return <img src={img} alt={`Stage ${id} illustration`} className={cn("w-full rounded-2xl object-cover", className)} />;
  const Icon = STAGE_ICONS[id] ?? Wrench;
  return (
    <div className={cn("relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-secondary", className)}>
      <span className={cn("absolute size-48 rounded-full opacity-15 blur-2xl", STAGE_BG[id])} />
      <span className={cn("grid size-28 place-items-center rounded-full text-primary-foreground shadow-soft ring-8 ring-card", STAGE_BG[id])}>
        <Icon className="size-12" strokeWidth={2} />
      </span>
    </div>
  );
}
