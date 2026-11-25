import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/lab/app-header";
import { LabStatus } from "@/components/lab/lab-status";
import { Robot } from "@/components/lab/robot";
import { StagePath } from "@/components/lab/stage-path";
import { StageBadge } from "@/components/lab/stage-visuals";
import { STAGES } from "@/lib/stages";
import { completedCount, currentStage, isUnlocked, STAGE_COUNT, stageProgress, useParticipant } from "@/lib/session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RAG LAB" },
      { name: "description", content: "Your RAG LAB progress: stages completed, quiz scores and where to continue." },
      { property: "og:title", content: "Dashboard — RAG LAB" },
      { property: "og:description", content: "Track your progress through the seven RAG LAB stages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const p = useParticipant();
  if (p === undefined) return <div className="min-h-screen" />;
  if (p === null) return <Navigate to="/" />;

  const done = completedCount(p);
  const cur = currentStage(p);
  const allDone = done === STAGE_COUNT;
  const scored = STAGES.map((s) => stageProgress(p, s.id).quizScore).filter((x): x is number => x !== null);
  const totalScore = scored.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section className="surface flex flex-col items-center gap-6 overflow-hidden p-6 sm:flex-row sm:p-8">
          <div className="flex-1 animate-rise">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Welcome, {p.name}!</h1>
            <p className="mt-2 text-muted-foreground">
              {allDone ? "You've completed every stage. Your chatbot is yours to keep using." : `Next up: Stage ${cur} — ${STAGES[cur]!.title}.`}
            </p>
            <div className="mt-5 max-w-md">
              <div className="mb-1.5 flex justify-between text-sm font-semibold">
                <span>Overall progress</span>
                <span>
                  {done}/{STAGE_COUNT} stages
                </span>
              </div>
              <Progress value={(done / STAGE_COUNT) * 100} className="h-2.5" />
            </div>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/stage/$stageId" params={{ stageId: String(allDone ? 6 : cur) }}>
                {allDone ? "Open my chatbot" : done === 0 ? "Start Stage 0" : "Continue Learning"} <ArrowRight />
              </Link>
            </Button>
          </div>
          <Robot mood={done > 0 ? "happy" : "normal"} message={allDone ? "You did it! 🎉" : done > 0 ? "Great progress! Keep going." : "Let's explore RAG together!"} />
        </section>

        <section className="surface p-5 sm:p-8">
          <h2 className="mb-6 text-xl font-bold">Learning path</h2>
          <StagePath participant={p} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <h2 className="text-lg font-bold">Quiz scores</h2>
              <span className="ml-auto text-sm font-semibold text-muted-foreground">
                Total {totalScore}/{STAGE_COUNT * 3}
              </span>
            </div>
            <ul className="divide-y">
              {STAGES.map((s) => {
                const pr = stageProgress(p, s.id);
                const open = isUnlocked(p, s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <StageBadge id={s.id} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        Stage {s.id} · {s.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {pr.completed ? "Completed" : !open ? "Locked" : pr.activityDone ? "Activity done · quiz pending" : "In progress"}
                      </span>
                    </span>
                    <span className="font-mono text-sm">{pr.quizScore !== null ? `${pr.quizScore}/3` : "–"}</span>
                    {pr.completed ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : !open ? (
                      <Lock className="size-4 text-muted-foreground" />
                    ) : (
                      <Link to="/stage/$stageId" params={{ stageId: String(s.id) }} className="text-sm font-semibold text-primary hover:underline">
                        Open
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <LabStatus />
        </div>
      </main>
    </div>
  );
}
