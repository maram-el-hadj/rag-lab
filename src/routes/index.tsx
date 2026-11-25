import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/lab/app-header";
import { Robot } from "@/components/lab/robot";
import { StagePath } from "@/components/lab/stage-path";
import { completedCount, createParticipant, forgetParticipant, STAGE_COUNT, useParticipant } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RAG LAB — build your own RAG chatbot, step by step" },
      {
        name: "description",
        content: "A hands-on workshop for professors: learn Retrieval-Augmented Generation in 7 stages and build a working chatbot from your own PDFs with Ollama and ChromaDB.",
      },
      { property: "og:title", content: "RAG LAB — build your own RAG chatbot, step by step" },
      { property: "og:description", content: "Learn RAG in 7 hands-on stages and build a working chatbot from your own PDFs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const participant = useParticipant();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  function start(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createParticipant(name);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AppHeader />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-8 pt-10 lg:grid-cols-[auto_1fr] lg:gap-12 lg:pt-16">
          <Robot
            size="lg"
            className="mx-auto lg:mx-0"
            message={participant ? `Welcome back, ${participant.name}!` : "Hi! I'm your RAG guide. What's your name?"}
          />
          <div className="animate-rise text-center lg:text-left">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Interactive workshop</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">
              Build your own <span className="text-gradient-sky">RAG chatbot</span>, step by step.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground lg:mx-0">
              Seven short stages. Real Python, real PDFs, real answers from Ollama. No installation on your computer.
            </p>

            <div className="mx-auto mt-8 max-w-md lg:mx-0">
              {participant === undefined ? (
                <div className="h-14" />
              ) : participant ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild variant="hero" size="lg">
                    <Link to="/dashboard">
                      Continue learning <ArrowRight />
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {completedCount(participant)} of {STAGE_COUNT} stages done ·{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 hover:text-foreground"
                      onClick={() => {
                        if (window.confirm("Start over with a new name? Your progress on this device will be cleared.")) forgetParticipant();
                      }}
                    >
                      Not {participant.name}?
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={start} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    aria-label="Your name"
                    maxLength={40}
                    required
                    className="h-12 rounded-full px-5 text-base"
                  />
                  <Button type="submit" variant="hero" size="lg" className="h-12" disabled={!name.trim()}>
                    Start Learning <ArrowRight />
                  </Button>
                </form>
              )}
              {!participant && participant !== undefined && (
                <p className="mt-2 text-xs text-muted-foreground">Only your name is needed. Your progress is saved on this device.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-6 text-center text-xl font-bold sm:text-2xl">Your learning journey</h2>
          <StagePath participant={participant} preview />
        </section>
      </main>
    </div>
  );
}
