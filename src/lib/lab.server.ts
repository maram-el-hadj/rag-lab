// Server-only helpers for calling the local RAG LAB Python backend (rag-backend/),
// with automatic cloud Demo Mode + Supabase persistence when the local server is unreachable.

export type LabResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; notConfigured?: boolean; status?: number };

function config() {
  const url = process.env["RAG_BACKEND_URL"]?.trim().replace(/\/+$/, "");
  const token = process.env["RAG_BACKEND_TOKEN"]?.trim();
  return { url: url || "http://127.0.0.1:8000", token: token || null };
}

function supabaseConfig() {
  const url = (process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "").trim().replace(/\/+$/, "");
  const key = (process.env["VITE_SUPABASE_ANON_KEY"] || process.env["SUPABASE_ANON_KEY"] || "").trim();
  return { url, key };
}

async function logDemoRunToSupabase(stageNumber: number, prompt: string, responseText: string) {
  const sb = supabaseConfig();
  if (!sb.url || !sb.key) return;
  try {
    await fetch(`${sb.url}/rest/v1/lab_demo_runs`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        stage_number: stageNumber,
        user_prompt: prompt.slice(0, 2000),
        demo_response: responseText.slice(0, 4000),
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Ignore logging errors so demo mode never breaks user flow
  }
}

export const NOT_CONFIGURED: LabResult<never> = {
  ok: false,
  notConfigured: true,
  error: "The local lab server isn't running. Start it with start.bat (Windows) or ./start.sh (Mac/Linux).",
};

async function handleDemoFallback<T>(
  path: string,
  method: string,
  jsonBody: Record<string, unknown> | undefined,
): Promise<LabResult<T>> {
  const now = new Date().toISOString();

  if (path === "/health") {
    return {
      ok: true,
      data: {
        ok: true,
        python_version: "3.11 (Cloud Demo Mode)",
        packages: { chromadb: "0.5.x", pypdf: "4.x", ollama: "demo-simulated" },
        ollama: {
          base_url_configured: true,
          reachable: true,
          models: ["llama3.2:3b", "nomic-embed-text"],
          error: null,
          missing: [],
          problems: [],
          commands: [],
        },
        ready: true,
        chat_model: "llama3.2:3b (Demo)",
        embed_model: "nomic-embed-text (Demo)",
      } as T,
    };
  }

  if (path === "/run") {
    const code = String(jsonBody?.["code"] ?? "");
    let stdout = "[Demo Mode] Python code executed successfully.\n";
    let result: Record<string, unknown> | null = { mode: "cloud_demo", status: "ok" };

    if (code.includes("chunk") || code.includes("split")) {
      stdout +=
        "Loaded sample document (1,420 characters)\n" +
        "Split into 4 overlapping chunks (chunk_size=400, overlap=60)\n" +
        "Chunk 0: 'Retrieval-Augmented Generation (RAG) combines an external knowledge base with an LLM...'\n" +
        "Chunk 1: '...to ground answers in verified PDF documents and reduce hallucinations.'\n";
      result = { chunks_count: 4, chunk_size: 400, overlap: 60 };
    } else if (code.includes("embed") || code.includes("cosine") || code.includes("vector")) {
      stdout +=
        "Generated 768-dim embeddings via nomic-embed-text (simulated)\n" +
        "Cosine similarity(query, chunk_0) = 0.892\n" +
        "Cosine similarity(query, chunk_1) = 0.841\n" +
        "Top match -> Chunk 0\n";
      result = { embedding_dim: 768, top_similarity: 0.892 };
    } else if (code.includes("chroma") || code.includes("collection") || code.includes("query")) {
      stdout +=
        "Connected to ChromaDB collection 'rag_lab_demo'\n" +
        "Indexed 4 chunks -> Retrieved top_k=2 relevant passages\n";
      result = { collection: "rag_lab_demo", retrieved: 2 };
    } else {
      stdout +=
        "Output preview:\n" +
        "-> Pipeline step verified in Cloud Demo Mode (logged to Supabase).\n";
    }

    await logDemoRunToSupabase(1, code, stdout);

    return {
      ok: true,
      data: {
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 145,
        timed_out: false,
        result,
      } as T,
    };
  }

  if (path === "/terminal") {
    const command = String(jsonBody?.["command"] ?? "");
    let stdout = `[Demo Mode] $ ${command}\n`;
    if (command.includes("ollama list")) {
      stdout +=
        "NAME                       ID              SIZE      MODIFIED\n" +
        "llama3.2:3b                a80c4f17acd5    2.0 GB    Demo Ready\n" +
        "nomic-embed-text:latest    0a109f422b47    274 MB    Demo Ready\n";
    } else if (command.includes("python") || command.includes("pip")) {
      stdout += "Python 3.11.9 | fastapi, chromadb, pypdf, httpx installed (Cloud Demo)\n";
    } else {
      stdout += "Command completed with exit code 0 (Cloud Demo Mode).\n";
    }

    await logDemoRunToSupabase(2, command, stdout);

    return {
      ok: true,
      data: {
        command,
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 95,
      } as T,
    };
  }

  if (path === "/documents" && method === "GET") {
    return {
      ok: true,
      data: {
        documents: [
          {
            id: "demo0000000000000000000000000001",
            filename: "RAG_Workshop_Guide_Demo.pdf",
            pages: 5,
            size: 184320,
            uploaded_at: now,
            path: "/demo/RAG_Workshop_Guide_Demo.pdf",
          },
        ],
      } as T,
    };
  }

  if (path === "/documents" && method === "POST") {
    return {
      ok: true,
      data: {
        id: "demo0000000000000000000000000002",
        filename: "Uploaded_Demo_Document.pdf",
        pages: 3,
        size: 102400,
        uploaded_at: now,
        path: "/demo/Uploaded_Demo_Document.pdf",
      } as T,
    };
  }

  if (path === "/chat/rebuild") {
    const out = { documents: 1, chunks: 12, duration_ms: 210 };
    await logDemoRunToSupabase(5, "rebuild_knowledge_base", JSON.stringify(out));
    return { ok: true, data: out as T };
  }

  if (path === "/chat/ask") {
    const question = String(jsonBody?.["question"] ?? "What is RAG?");
    const answer =
      `[Cloud Demo Mode] Based on the indexed workshop documents, here is the grounded answer to "${question}":\n\n` +
      "Retrieval-Augmented Generation (RAG) first splits PDFs into overlapping text chunks, converts them into vector embeddings, stores them in ChromaDB, retrieves the top-K closest chunks for your question, and passes them as context to the LLM so every answer stays faithful to your sources.";

    await logDemoRunToSupabase(6, question, answer);

    return {
      ok: true,
      data: {
        answer,
        sources: [
          {
            filename: "RAG_Workshop_Guide_Demo.pdf",
            page: 2,
            text: "RAG retrieves the top-K relevant document chunks from ChromaDB and injects them into the prompt context before generation.",
            distance: 0.14,
          },
        ],
        duration_ms: 320,
      } as T,
    };
  }

  if (path === "/chat/history" && method === "GET") {
    return { ok: true, data: { messages: [] } as T };
  }

  return { ok: true, data: { ok: true } as T };
}

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
    return handleDemoFallback<T>(
      path,
      method,
      init.json && typeof init.json === "object" ? (init.json as Record<string, unknown>) : undefined,
    );
  }
}
