import { createFileRoute, Link, Navigate, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, LayoutDashboard, Lock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/lab/app-header";
import { Chatbot } from "@/components/lab/chatbot";
import { CodeLesson } from "@/components/lab/code-viewer";
import { useDocuments } from "@/components/lab/documents";
import { Quiz } from "@/components/lab/quiz";
import { Robot, type Mood } from "@/components/lab/robot";
import { LabRunner } from "@/components/lab/runner";
import { Section, SECTION_TITLES } from "@/components/lab/section";
import { StageBadge, StageHero, STAGE_TEXT } from "@/components/lab/stage-visuals";
import { LabTerminal } from "@/components/lab/terminal";
import type { LabDocument } from "@/lib/lab.functions";
import { isUnlocked, markActivityDone, PASS_SCORE, recordQuizScore, STAGE_COUNT, stageProgress, useParticipant } from "@/lib/session";
import { defaultParams, getStage, type ParamValues, type Stage } from "@/lib/stages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stage/$stageId")({
  loader: ({ params }) => {
    const stage = getStage(Number(params.stageId));
    if (!stage || !/^\d$/.test(params.stageId)) throw notFound();
    return { id: stage.id, title: stage.title, goal: stage.goal };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Stage ${loaderData.id}: ${loaderData.title} — RAG LAB` : "Stage — RAG LAB";
    const description = loaderData ? `${loaderData.goal} Short lessons, real Python code and a quiz.` : "A RAG LAB learning stage.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: StagePage,
});

function StagePage() {
  const { id } = Route.useLoaderData();
  const p = useParticipant();
  if (p === undefined) return <div className="min-h-screen" />;
  if (p === null) return <Navigate to="/" />;
  const stage = getStage(id)!;
  if (!isUnlocked(p, id)) return <Locked stage={stage} />;
  return <StageContent key={id} stage={stage} sessionId={p.id} />;
}

function Locked({ stage }: { stage: Stage }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-lg place-items-center px-4 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Stage {stage.id} is locked</h1>
        <p className="mt-2 text-muted-foreground">Complete Stage {stage.id - 1} first: finish its activity and pass its quiz.</p>
        <Button asChild variant="hero" className="mt-6">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </main>
    </div>
  );
}

function StageContent({ stage, sessionId }: { stage: Stage; sessionId: string }) {
  const p = useParticipant();
  const prog = stageProgress(p, stage.id);
  const [robot, setRobot] = useState<{ mood: Mood; message: string }>({ mood: "normal", message: stage.robot });
  const [values, setValues] = useState<ParamValues>(() => defaultParams(stage));
  const [doc, setDoc] = useState<LabDocument | null>(null);
  const docs = useDocuments(sessionId);
  const wasCompleted = useRef(prog.completed);

  // Preselect the first uploaded PDF for stages that need one.
  useEffect(() => {
    if (stage.needsDocument && !doc && docs.data?.ok && docs.data.data.documents[0]) setDoc(docs.data.data.documents[0]);
  }, [stage.needsDocument, doc, docs.data]);

  useEffect(() => {
    if (prog.completed && !wasCompleted.current) {
      setRobot({ mood: "happy", message: "Stage completed!" });
      toast.success(`Stage ${stage.id} completed!`);
      document.getElementById("step-7")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    wasCompleted.current = prog.completed;
  }, [prog.completed, stage.id]);

  function onRun(ok: boolean) {
    if (ok) {
      markActivityDone(stage.id);
      setRobot({ mood: "happy", message: "Great job! The code ran successfully." });
    } else {
      setRobot({ mood: "angry", message: "That didn't work. Check the output and try again!" });
    }
  }

  const prevId = stage.id - 1;
  const nextId = stage.id + 1;
  const nextUnlocked = nextId < STAGE_COUNT && isUnlocked(p, nextId);

  const nav = (
    <div className="flex flex-wrap items-center gap-2">
      {prevId >= 0 && (
        <Button asChild variant="outline" size="sm">
          <Link to="/stage/$stageId" params={{ stageId: String(prevId) }}>
            <ArrowLeft /> Previous stage
          </Link>
        </Button>
      )}
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <LayoutDashboard /> Back to Dashboard
        </Link>
      </Button>
      {nextId < STAGE_COUNT &&
        (nextUnlocked ? (
          <Button asChild variant="default" size="sm">
            <Link to="/stage/$stageId" params={{ stageId: String(nextId) }}>
              Next stage <ArrowRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled title="Complete this stage to unlock the next one">
            <Lock /> Next stage
          </Button>
        ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Stage header */}
        <div className="surface mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <StageBadge id={stage.id} className="size-16 shrink-0 shadow-soft" />
          <div className="flex-1">
            <p className={cn("font-display text-xs font-bold uppercase tracking-[0.2em]", STAGE_TEXT[stage.id])}>Stage {stage.id}</p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{stage.title}</h1>
            <p className="mt-1 text-muted-foreground">
              <b className="text-foreground">Goal:</b> {stage.goal}
            </p>
          </div>
          <div className="lg:hidden">
            <Robot size="sm" mood={robot.mood} message={robot.message} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <nav aria-label="Stage steps" className="surface p-3">
                <ol className="space-y-0.5">
                  {SECTION_TITLES.map((t, i) => {
                    const done = (i === 3 && prog.activityDone) || (i === 5 && (prog.quizScore ?? 0) >= PASS_SCORE) || (i === 6 && prog.completed);
                    return (
                      <li key={t}>
                        <a href={`#step-${i + 1}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                          {done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4" />}
                          {i + 1}. {t}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </nav>
              <Robot size="md" stacked mood={robot.mood} message={robot.message} />
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            <Section n={1}>
              <div className="space-y-3 text-[15px] leading-relaxed">
                {stage.intro.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
              <h3 className="mb-2 mt-5 text-base font-semibold">What you will understand</h3>
              <ul className="grid gap-2">
                {stage.learn.map((t) => (
                  <li key={t} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </Section>

            <Section n={2}>
              <div className="grid gap-6 md:grid-cols-[16rem_1fr] md:items-center">
                <StageHero id={stage.id} />
                <div>
                  <ol className="flex flex-wrap items-center gap-2">
                    {stage.flow.map((f, i) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="rounded-lg border bg-secondary/60 px-3 py-2 text-sm font-semibold">{f}</span>
                        {i < stage.flow.length - 1 && <ArrowRight className="size-4 text-primary" />}
                      </li>
                    ))}
                  </ol>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {stage.concepts.map((c) => (
                      <div key={c.term} className="rounded-xl border p-3">
                        <dt className="font-mono text-sm font-semibold text-primary">{c.term}</dt>
                        <dd className="mt-0.5 text-sm text-muted-foreground">{c.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Section>

            <Section n={3}>
              <CodeLesson blocks={stage.blocks} values={doc ? { ...values, PDF_PATH: doc.path, FILENAME: doc.filename } : { ...values, PDF_PATH: "docs/your-file.pdf", FILENAME: "your-file.pdf" }} />
            </Section>

            {stage.id === 6 ? (
              <>
                <Section n={4} title="Build and use your chatbot">
                  <Chatbot
                    sessionId={sessionId}
                    onAnswered={() => {
                      markActivityDone(6);
                      setRobot({ mood: "happy", message: "Your chatbot answered from your documents!" });
                    }}
                  />
                </Section>
                <Section n={5}>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Change the chunk size", "Rebuild with 300, then 1500 characters. Do answers get more precise or more complete?"],
                      ["Change Top-K", "Ask the same question with Top-K 1 and Top-K 8. Compare the sources."],
                      ["Ask something unrelated", "Your chatbot should reply that it couldn't find enough information in your documents, and show no sources."],
                      ["Add a second PDF", "Upload another document, rebuild, and ask a question that needs both."],
                    ].map(([t, d]) => (
                      <li key={t} className="rounded-xl border p-4">
                        <p className="font-semibold">{t}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            ) : (
              <>
                <LabRunner
                  stage={stage}
                  sessionId={sessionId}
                  values={values}
                  setValues={setValues}
                  doc={doc}
                  setDoc={setDoc}
                  activityDone={prog.activityDone}
                  onRunFinished={onRun}
                />
                {stage.id === 0 && (
                  <Section n={5} title="Experiment in the terminal">
                    <p className="mb-4 text-sm text-muted-foreground">
                      These are real commands, run on your computer by the local lab server. Try them in order and read what each one prints.
                    </p>
                    <LabTerminal sessionId={sessionId} onSuccess={() => setRobot({ mood: "happy", message: "Nice! That command worked." })} />
                  </Section>
                )}
              </>
            )}

            <Section n={6}>
              <Quiz
                questions={stage.quiz}
                bestScore={prog.quizScore}
                onAnswer={(ok) => setRobot(ok ? { mood: "happy", message: "Great job!" } : { mood: "angry", message: "That's not quite right. Try again!" })}
                onFinish={(score) => recordQuizScore(stage.id, score)}
              />
            </Section>

            <Section n={7}>
              {prog.completed ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <span className="relative grid size-20 animate-pop place-items-center rounded-full bg-success text-success-foreground shadow-soft">
                    <PartyPopper className="size-9" />
                  </span>
                  <h3 className="text-2xl font-bold">Stage {stage.id} completed!</h3>
                  <p className="text-muted-foreground">
                    Quiz score {prog.quizScore}/3.{" "}
                    {nextId < STAGE_COUNT ? `Stage ${nextId} is now unlocked.` : "You finished every stage of RAG LAB!"}
                  </p>
                  {nextId < STAGE_COUNT ? (
                    <Button asChild variant="hero" size="lg">
                      <Link to="/stage/$stageId" params={{ stageId: String(nextId) }}>
                        Go to Stage {nextId} <ArrowRight />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="hero" size="lg">
                      <Link to="/dashboard">Back to Dashboard</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-muted-foreground">To complete this stage and unlock the next one:</p>
                  <ul className="space-y-2">
                    <Check done={prog.activityDone} label={stage.activity} />
                    <Check done={(prog.quizScore ?? 0) >= PASS_SCORE} label={`Pass the quiz (at least ${PASS_SCORE} of 3 correct)`} />
                  </ul>
                </div>
              )}
            </Section>

            <div className="pb-8">{nav}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm", done && "border-success/40 bg-success/5")}>
      {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
      <span className={cn(done && "font-semibold")}>{label}</span>
    </li>
  );
}
