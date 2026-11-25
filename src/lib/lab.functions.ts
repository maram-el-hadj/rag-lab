import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { labFetch, type LabResult } from "./lab.server";

const sid = z.string().uuid();

export type Health = {
  ok: boolean;
  python_version: string;
  packages: Record<string, string>;
  ollama: {
    base_url_configured: boolean;
    reachable: boolean;
    models: string[];
    error: string | null;
    missing: string[];
    problems: string[];
    commands: string[];
  };
  ready: boolean;
  chat_model: string;
  embed_model: string;
};
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type RunOutput = {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  timed_out: boolean;
  result: { [key: string]: Json } | null;
};
export type TerminalOutput = { command: string; stdout: string; stderr: string; exit_code: number; duration_ms: number };
export type LabDocument = { id: string; filename: string; pages: number; size: number; uploaded_at: string; path: string };
export type Source = { filename: string; page: number; text: string; distance: number };
export type ChatMessage = { role: "user" | "assistant"; content: string; sources: Source[]; at: string };

export const getHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<LabResult<Health>> => labFetch<Health>("/health", { timeoutMs: 15_000 }),
);

export const runCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid, code: z.string().min(1).max(200_000) }).parse(d))
  .handler(async ({ data }): Promise<LabResult<RunOutput>> =>
    labFetch<RunOutput>("/run", { sessionId: data.sessionId, json: { code: data.code }, timeoutMs: 300_000 }),
  );

export const runTerminal = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid, command: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data }): Promise<LabResult<TerminalOutput>> =>
    labFetch<TerminalOutput>("/terminal", {
      sessionId: data.sessionId,
      json: { command: data.command },
      timeoutMs: 600_000,
    }),
  );

export const listDocuments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid }).parse(d))
  .handler(async ({ data }): Promise<LabResult<{ documents: LabDocument[] }>> =>
    labFetch("/documents", { sessionId: data.sessionId, method: "GET" }),
  );

export const uploadDocument = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        sessionId: sid,
        filename: z.string().min(1).max(200),
        base64: z.string().min(1).max(28_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<LabResult<LabDocument>> => {
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("file", new Blob([bin], { type: "application/pdf" }), data.filename);
    return labFetch<LabDocument>("/documents", { sessionId: data.sessionId, body: form, method: "POST" });
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid, id: z.string().regex(/^[a-f0-9]{32}$/) }).parse(d))
  .handler(async ({ data }): Promise<LabResult<{ ok: boolean }>> =>
    labFetch(`/documents/${data.id}`, { sessionId: data.sessionId, method: "DELETE" }),
  );

export const rebuildKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ sessionId: sid, chunkSize: z.number().int().min(100).max(4000), chunkOverlap: z.number().int().min(0).max(2000) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<LabResult<{ documents: number; chunks: number; duration_ms: number }>> =>
    labFetch("/chat/rebuild", {
      sessionId: data.sessionId,
      json: { chunk_size: data.chunkSize, chunk_overlap: data.chunkOverlap },
      timeoutMs: 600_000,
    }),
  );

export const askChat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ sessionId: sid, question: z.string().min(1).max(4000), topK: z.number().int().min(1).max(20) }).parse(d),
  )
  .handler(async ({ data }): Promise<LabResult<{ answer: string; sources: Source[]; duration_ms: number }>> =>
    labFetch("/chat/ask", {
      sessionId: data.sessionId,
      json: { question: data.question, top_k: data.topK },
      timeoutMs: 300_000,
    }),
  );

export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid }).parse(d))
  .handler(async ({ data }): Promise<LabResult<{ messages: ChatMessage[] }>> =>
    labFetch("/chat/history", { sessionId: data.sessionId, method: "GET" }),
  );

export const clearChatHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid }).parse(d))
  .handler(async ({ data }): Promise<LabResult<{ ok: boolean }>> =>
    labFetch("/chat/history", { sessionId: data.sessionId, method: "DELETE" }),
  );

export const resetSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionId: sid }).parse(d))
  .handler(async ({ data }): Promise<LabResult<{ ok: boolean }>> =>
    labFetch("/session", { sessionId: data.sessionId, method: "DELETE" }),
  );
