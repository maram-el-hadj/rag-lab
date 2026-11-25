import { useSyncExternalStore } from "react";

export const STAGE_COUNT = 7;
export const PASS_SCORE = 2; // out of 3

export type StageProgress = {
  activityDone: boolean;
  quizScore: number | null; // best score
  completed: boolean;
};

export type Participant = {
  id: string;
  name: string;
  createdAt: string;
  stages: Record<number, StageProgress>;
};

const KEY = "raglab.participant.v1";
const listeners = new Set<() => void>();
let cache: Participant | null | undefined;

function safeUUID(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }
  return "id-" + Math.random().toString(36).slice(2, 11) + "-" + Date.now().toString(36);
}

function read(): Participant | null {
  if (cache !== undefined) return cache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Participant) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function write(p: Participant | null) {
  cache = p;
  try {
    if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore storage errors in restricted browser modes
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = undefined;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useParticipant(): Participant | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => undefined,
  );
}

export function emptyStage(): StageProgress {
  return { activityDone: false, quizScore: null, completed: false };
}

export function stageProgress(p: Participant | null | undefined, stage: number): StageProgress {
  return p?.stages[stage] ?? emptyStage();
}

export function createParticipant(name: string): Participant {
  const p: Participant = {
    id: safeUUID(),
    name: name.trim().slice(0, 40),
    createdAt: new Date().toISOString(),
    stages: {},
  };
  write(p);
  return p;
}

export function renameParticipant(name: string) {
  const p = read();
  if (p) write({ ...p, name: name.trim().slice(0, 40) });
}

export function forgetParticipant() {
  write(null);
}

function updateStage(stage: number, fn: (s: StageProgress) => StageProgress) {
  const p = read();
  if (!p) return;
  const next = fn(p.stages[stage] ?? emptyStage());
  next.completed = next.activityDone && (next.quizScore ?? 0) >= PASS_SCORE;
  write({ ...p, stages: { ...p.stages, [stage]: next } });
}

export function markActivityDone(stage: number) {
  updateStage(stage, (s) => ({ ...s, activityDone: true }));
}

export function recordQuizScore(stage: number, score: number) {
  updateStage(stage, (s) => ({ ...s, quizScore: Math.max(score, s.quizScore ?? 0) }));
}

export function isUnlocked(p: Participant | null | undefined, stage: number): boolean {
  if (stage === 0) return true;
  return stageProgress(p, stage - 1).completed;
}

export function currentStage(p: Participant | null | undefined): number {
  for (let i = 0; i < STAGE_COUNT; i++) if (!stageProgress(p, i).completed) return i;
  return STAGE_COUNT - 1;
}

export function completedCount(p: Participant | null | undefined): number {
  let n = 0;
  for (let i = 0; i < STAGE_COUNT; i++) if (stageProgress(p, i).completed) n++;
  return n;
}
