// Server-only helpers for calling the local RAG LAB Python backend (rag-backend/),
// with realistic cloud Demo Mode + Supabase persistence when the local server is unreachable.

export type LabResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; notConfigured?: boolean; status?: number };

type DemoDoc = {
  id: string;
  filename: string;
  pages: number;
  size: number;
  uploaded_at: string;
  path: string;
  sampleText: string;
};

const demoDocsStore: DemoDoc[] = [
  {
    id: "demo0000000000000000000000000001",
    filename: "RAG_Workshop_Guide_Demo.pdf",
    pages: 5,
    size: 184320,
    uploaded_at: new Date().toISOString(),
    path: "/demo/RAG_Workshop_Guide_Demo.pdf",
    sampleText:
      "Retrieval-Augmented Generation (RAG) improves Large Language Models by retrieving relevant chunks from external documents before generating an answer. Splitting documents into overlapping chunks preserves context across boundaries, while vector embeddings capture semantic meaning for similarity search in ChromaDB.",
  },
];

function config() {
  const url = process.env["RAG_BACKEND_URL"]?.trim().replace(/\/+$/, "");
  const token = process.env["RAG_BACKEND_TOKEN"]?.trim();
  return { url: url || "http://127.0.0.1:8000", token: token || null };
}

function supabaseConfig() {
  const url = (process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "").trim().replace(/\/+$/, "");
  const key = (
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    ""
  ).trim();
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

function extractNumberParam(code: string, name: string, fallback: number): number {
  const re = new RegExp(`\\b${name}\\s*=\\s*(\\d+)`);
  const m = code.match(re);
  return m ? Number(m[1]) : fallback;
}

function extractStringParam(code: string, name: string, fallback: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`);
  const m = code.match(re);
  return m && m[1] ? m[1] : fallback;
}

function buildChunksFromText(text: string, chunkSize: number, overlap: number) {
  const safeSize = Math.max(80, chunkSize);
  const safeOverlap = Math.max(0, Math.min(overlap, safeSize - 10));
  const step = Math.max(20, safeSize - safeOverlap);

  const repeated = (text + " ").repeat(Math.max(2, Math.ceil(1600 / Math.max(80, text.length)))).trim();
  const chunks: { index: number; length: number; text: string }[] = [];
  let idx = 0;
  for (let start = 0; start < repeated.length && chunks.length < 24; start += step) {
    const slice = repeated.slice(start, start + safeSize).trim();
    if (!slice) continue;
    chunks.push({ index: idx++, length: slice.length, text: slice });
  }
  const avgLength =
    chunks.length > 0 ? Math.round(chunks.reduce((acc, c) => acc + c.length, 0) / chunks.length) : 0;
  return { chunks, avgLength, totalChars: repeated.length };
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
  rawBody?: BodyInit,
): Promise<LabResult<T>> {
  const now = new Date().toISOString();

  if (path === "/health") {
    return {
      ok: true,
      data: {
        ok: true,
        python_version: "3.11.9 (Cloud Demo)",
        packages: { chromadb: "0.5.x", pypdf: "4.x", ollama: "demo-ready", fastapi: "0.115.x" },
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
    const activeDoc = demoDocsStore[demoDocsStore.length - 1] ?? demoDocsStore[0];
    const docName = extractStringParam(code, "FILENAME", activeDoc.filename);
    const chunkSize = extractNumberParam(code, "CHUNK_SIZE", 500);
    const overlap = extractNumberParam(code, "CHUNK_OVERLAP", 80);
    const question = extractStringParam(code, "QUESTION", "What is RAG and how does chunking help?");
    const topK = extractNumberParam(code, "TOP_K", 3);

    // Stage 0 environment check
    if (code.includes("ollama") && (code.includes("models") || code.includes("11434") || code.includes("psutil") || code.includes("sys.version"))) {
      const data = {
        stdout: "[Demo Mode] Environment check passed (Python 3.11.9, llama3.2:3b, nomic-embed-text).\n",
        stderr: "",
        exit_code: 0,
        duration_ms: 120,
        timed_out: false,
        result: {
          ready: true,
          python: "3.11.9",
          chat_model: "llama3.2:3b",
          embed_model: "nomic-embed-text",
          packages: { pypdf: "4.3.1", chromadb: "0.5.20", ollama: "0.4.2", numpy: "1.26.4" },
          models: ["llama3.2:3b", "nomic-embed-text"],
        },
      };
      await logDemoRunToSupabase(0, code, data.stdout);
      return { ok: true, data: data as T };
    }

    // Stage 1: PDF loading & chunking
    if (code.includes("CHUNK_SIZE") || code.includes("PdfReader") || code.includes("chunk")) {
      const { chunks, avgLength, totalChars } = buildChunksFromText(activeDoc.sampleText, chunkSize, overlap);
      const stdout =
        `[Demo Mode] Loaded ${docName} (${activeDoc.pages} pages, ${totalChars} chars)\n` +
        `Split text into ${chunks.length} chunks (chunk_size=${chunkSize}, overlap=${overlap}, avg=${avgLength} chars)\n`;
      const data = {
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 160,
        timed_out: false,
        result: {
          pages: activeDoc.pages,
          characters: totalChars,
          chunk_count: chunks.length,
          average_length: avgLength,
          first_page: activeDoc.sampleText,
          chunks: chunks.slice(0, 8),
        },
      };
      await logDemoRunToSupabase(1, code, stdout);
      return { ok: true, data: data as T };
    }

    // Stage 2: Embeddings & cosine similarity
    if (code.includes("embed") || code.includes("cosine") || code.includes("similarity")) {
      const sentences = [
        "RAG retrieves relevant document passages before generating an answer.",
        "Vector embeddings represent text semantics as dense numerical arrays.",
        "Baking a chocolate cake requires flour, eggs, and oven preheating.",
      ];
      const matrix = [
        [1.0, 0.842, 0.074],
        [0.842, 1.0, 0.091],
        [0.074, 0.091, 1.0],
      ];
      const embeddedChunks = [
        { text: activeDoc.sampleText.slice(0, 140), first: [0.0412, -0.0821, 0.1194, 0.0305, -0.0548] },
        { text: "Chunking splits long PDFs into overlapping windows for accurate retrieval.", first: [0.0389, -0.0764, 0.1128, 0.0277, -0.0491] },
      ];
      const stdout = `[Demo Mode] Computed 768-dim embeddings for ${embeddedChunks.length} chunks and 3 sample sentences.\n`;
      const data = {
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 190,
        timed_out: false,
        result: {
          dimensions: 768,
          chunks: embeddedChunks,
          sentences,
          matrix,
        },
      };
      await logDemoRunToSupabase(2, code, stdout);
      return { ok: true, data: data as T };
    }

    // Stage 3: ChromaDB storage
    if (code.includes("chroma") || code.includes("collection") || code.includes("upsert") || code.includes("add(")) {
      const items = [
        { id: "doc_chunk_0", metadata: { source: docName, page: 1 }, text: activeDoc.sampleText.slice(0, 150) },
        { id: "doc_chunk_1", metadata: { source: docName, page: 2 }, text: "Overlapping chunks preserve context across page and section breaks." },
      ];
      const stdout = `[Demo Mode] Stored ${items.length} chunks in ChromaDB collection 'rag_lab_demo'.\n`;
      const data = {
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 150,
        timed_out: false,
        result: {
          collection: "rag_lab_demo",
          count: items.length,
          dimensions: 768,
          items,
        },
      };
      await logDemoRunToSupabase(3, code, stdout);
      return { ok: true, data: data as T };
    }

    // Stage 4: Retrieval
    if (code.includes("TOP_K") || code.includes("query") || code.includes("retrieve")) {
      const hits = Array.from({ length: Math.min(topK, 3) }, (_, idx) => ({
        rank: idx + 1,
        similarity: Number((0.91 - idx * 0.06).toFixed(3)),
        page: idx + 1,
        source: docName,
        text: activeDoc.sampleText,
      }));
      const stdout = `[Demo Mode] Retrieved top ${hits.length} chunks for query: "${question}"\n`;
      const data = {
        stdout,
        stderr: "",
        exit_code: 0,
        duration_ms: 170,
        timed_out: false,
        result: {
          dimensions: 768,
          hits,
        },
      };
      await logDemoRunToSupabase(4, code, stdout);
      return { ok: true, data: data as T };
    }

    // Stage 5: Grounded RAG answer
    const answer =
      `[Demo Mode] Based on ${docName}, here is the answer to "${question}":\n\n` +
      "RAG retrieves the most relevant passages from your indexed documents and grounds the model's response in those excerpts rather than relying solely on parametric memory.";
    const sources = [
      { source: docName, page: 1, similarity: 0.91, text: activeDoc.sampleText },
      { source: docName, page: 2, similarity: 0.85, text: "Chunking and vector similarity search narrow context to relevant passages." },
    ];
    const prompt = `System: Answer only using the provided context.\nContext: ${activeDoc.sampleText}\nQuestion: ${question}`;
    const data = {
      stdout: `[Demo Mode] Generated grounded answer using ${sources.length} retrieved sources.\n`,
      stderr: "",
      exit_code: 0,
      duration_ms: 240,
      timed_out: false,
      result: {
        answered: true,
        skipped_llm: false,
        answer,
        sources,
        prompt,
      },
    };
    await logDemoRunToSupabase(5, question, answer);
    return { ok: true, data: data as T };
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
      stdout += "Python 3.11.9 | fastapi, chromadb, pypdf, ollama installed (Demo Mode)\n";
    } else {
      stdout += "Command completed (exit code 0).\n";
    }
    await logDemoRunToSupabase(0, command, stdout);
    return {
      ok: true,
      data: { command, stdout, stderr: "", exit_code: 0, duration_ms: 90 } as T,
    };
  }

  if (path === "/documents" && method === "GET") {
    return {
      ok: true,
      data: {
        documents: demoDocsStore.map(({ sampleText: _s, ...rest }) => rest),
      } as T,
    };
  }

  if (path === "/documents" && method === "POST") {
    let uploadedName = "Uploaded_Workshop_Doc.pdf";
    let uploadedSize = 148000;
    if (typeof FormData !== "undefined" && rawBody instanceof FormData) {
      const fileEntry = rawBody.get("file");
      if (fileEntry && typeof fileEntry === "object" && "name" in fileEntry) {
        uploadedName = String((fileEntry as { name?: unknown }).name || uploadedName);
      }
      if (fileEntry && typeof fileEntry === "object" && "size" in fileEntry) {
        const sz = Number((fileEntry as { size?: unknown }).size);
        if (sz > 0) uploadedSize = sz;
      }
    }
    const cleanTitle = uploadedName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
    const id = Array.from({ length: 32 }, (_, i) => ((i * 7 + uploadedName.length) % 16).toString(16)).join("");
    const newDoc: DemoDoc = {
      id,
      filename: uploadedName,
      pages: 4,
      size: uploadedSize,
      uploaded_at: now,
      path: `/demo/${uploadedName}`,
      sampleText: `Document "${cleanTitle}" covers key concepts, structured sections, and practical examples for Retrieval-Augmented Generation (RAG), chunking strategies, embeddings, and vector search.`,
    };
    const existingIdx = demoDocsStore.findIndex((d) => d.filename === uploadedName);
    if (existingIdx >= 0) {
      demoDocsStore[existingIdx] = newDoc;
    } else {
      demoDocsStore.push(newDoc);
    }
    await logDemoRunToSupabase(1, `upload:${uploadedName}`, `Uploaded ${uploadedName} (${uploadedSize} bytes)`);
    const { sampleText: _ignored, ...publicDoc } = newDoc;
    return { ok: true, data: publicDoc as T };
  }

  if (path.startsWith("/documents/") && method === "DELETE") {
    const docId = path.replace("/documents/", "");
    const idx = demoDocsStore.findIndex((d) => d.id === docId);
    if (idx >= 0 && demoDocsStore.length > 1) {
      demoDocsStore.splice(idx, 1);
    }
    return { ok: true, data: { ok: true } as T };
  }

  if (path === "/chat/rebuild") {
    const out = { documents: demoDocsStore.length, chunks: demoDocsStore.length * 6, duration_ms: 210 };
    await logDemoRunToSupabase(5, "rebuild_knowledge_base", JSON.stringify(out));
    return { ok: true, data: out as T };
  }

  if (path === "/chat/ask") {
    const question = String(jsonBody?.["question"] ?? "What is RAG?");
    const doc = demoDocsStore[demoDocsStore.length - 1] ?? demoDocsStore[0];
    const answer =
      `[Demo Mode] Based on ${doc.filename}, here is the answer to "${question}":\n\n` +
      doc.sampleText;
    await logDemoRunToSupabase(6, question, answer);
    return {
      ok: true,
      data: {
        answer,
        sources: [{ filename: doc.filename, page: 1, text: doc.sampleText, distance: 0.12 }],
        duration_ms: 280,
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
      body,
    );
  }
}
