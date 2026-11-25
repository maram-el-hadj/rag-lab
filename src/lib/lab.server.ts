// Server-only helpers for calling the local RAG LAB Python backend (rag-backend/).
// The browser never talks to Python directly; every call goes through a server
// function so the backend URL and optional token stay on the server.

export type LabResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; notConfigured?: boolean; status?: number };

function config() {
  const url = process.env["RAG_BACKEND_URL"]?.trim().replace(/\/+$/, "");
  const token = process.env["RAG_BACKEND_TOKEN"]?.trim();
  return { url: url || "http://127.0.0.1:8000", token: token || null };
}

export const NOT_CONFIGURED: LabResult<never> = {
  ok: false,
  notConfigured: true,
  error: "The local lab server isn't running. Start it with start.bat (Windows) or ./start.sh (Mac/Linux).",
};

export async function labFetch<T>(
  path: string,
  init: { method?: string; sessionId?: string; json?: unknown; body?: BodyInit; timeoutMs?: number } = {},
): Promise<LabResult<T>> {
  const cfg = config();
  const method = init.method ?? (init.body || init.json !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = {};
  if (cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;
  if (init.sessionId) headers["X-Session-Id"] = init.sessionId;
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  try {
    const req: RequestInit = {
      method,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(init.timeoutMs ?? 120_000),
    };
    if (body !== undefined) req.body = body;
    const res = await fetch(`${cfg.url}${path}`, req);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `The lab server answered with status ${res.status}.`;
      return { ok: false, error: msg, status: res.status };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return NOT_CONFIGURED;
  }
}
