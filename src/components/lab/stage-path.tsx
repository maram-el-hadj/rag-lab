import { Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { STAGES } from "@/lib/stages";
import { currentStage, isUnlocked, stageProgress, type Participant } from "@/lib/session";
import { cn } from "@/lib/utils";
import { StageBadge } from "./stage-visuals";

export function StagePath({ participant, preview = false }: { participant: Participant | null | undefined; preview?: boolean }) {
  const current = currentStage(participant);
  const n = STAGES.length;
  const step = 34; // px rise per stage on desktop

  return (
    <div className="relative">
      {/* Desktop staircase */}
      <div className="relative hidden md:block" style={{ height: (n - 1) * step + 150 }}>
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${n * 100} ${(n - 1) * step + 150}`} aria-hidden="true">
          <polyline
            points={STAGES.map((s, i) => `${i * 100 + 50},${(n - 1 - i) * step + 70}`).join(" ")}
            fill="none"
            className="stroke-border"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 10"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {STAGES.map((s, i) => (
            <li key={s.id} className="flex flex-col items-center" style={{ paddingTop: (n - 1 - i) * step }}>
              <Node participant={participant} id={s.id} current={current} preview={preview} />
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile path */}
      <ol className="relative space-y-3 md:hidden">
        <span className="absolute bottom-6 left-7 top-6 w-0.5 bg-border" aria-hidden="true" />
        {STAGES.map((s) => (
          <li key={s.id} className="relative">
            <Node participant={participant} id={s.id} current={current} preview={preview} row />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Node({ participant, id, current, preview, row }: { participant: Participant | null | undefined; id: number; current: number; preview: boolean; row?: boolean }) {
  const s = STAGES[id]!;
  const prog = stageProgress(participant, id);
  const unlocked = preview || isUnlocked(participant, id);
  const isCurrent = !preview && id === current && !prog.completed;

  const circle = (
    <span className="relative">
      {isCurrent && <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />}
      <span className={cn("relative block rounded-full p-1.5 shadow-soft", unlocked ? "bg-card" : "bg-muted")}>
        {unlocked ? (
          <StageBadge id={id} className={cn(row ? "size-11" : "size-14", isCurrent && "ring-4 ring-primary/30")} />
        ) : (
          <span className={cn("grid place-items-center rounded-full bg-border text-muted-foreground", row ? "size-11" : "size-14")}>
            <Lock className="size-5" />
          </span>
        )}
      </span>
      {prog.completed && (
        <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-card bg-success text-success-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );

  const label = (
    <span className={cn(row ? "text-left" : "mt-2 text-center")}>
      <span className="block font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Stage {id}</span>
      <span className={cn("block text-sm font-semibold leading-tight", !unlocked && "text-muted-foreground")}>{s.title}</span>
      {!row ? null : <span className="block text-xs text-muted-foreground">{prog.completed ? `Completed · quiz ${prog.quizScore}/3` : unlocked ? s.short : "Locked"}</span>}
    </span>
  );

  const classes = cn(
    "group flex items-center rounded-2xl transition-transform",
    row ? "gap-3 p-1.5 pr-3" : "flex-col px-1",
    unlocked && !preview && "hover:-translate-y-1",
    row && isCurrent && "bg-secondary",
  );

  if (!unlocked || preview) {
    return (
      <div className={classes} aria-disabled={!unlocked}>
        {circle}
        {label}
      </div>
    );
  }
  return (
    <Link to="/stage/$stageId" params={{ stageId: String(id) }} className={classes} aria-label={`Open stage ${id}: ${s.title}`}>
      {circle}
      {label}
    </Link>
  );
}
