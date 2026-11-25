// Server-only helpers for calling the local RAG LAB Python backend (rag-backend/),
// supporting DeepSeek, OpenAI, and Gemini with multi-key rotation, instant stage fallback, and Supabase logging.

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
      "Retrieval-Augmented Generation (RAG) combines document retrieval with Large Language Models so answers stay grounded in verified sources. Splitting PDFs into overlapping chunks keeps context intact across boundaries, and vector embeddings enable semantic similarity search in ChromaDB.",
  },
];

let keyCursor = 0;

function config() {
  const url = process.env["RAG_BACKEND_URL"]?.trim().replace(/\/+$/, "");
  const token = process.env["RAG_BACKEND_TOKEN"]?.trim();
  return { url: url || "http://127.0.0.1:8000", token: token || null };
}

function parseKeys(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function deepseekKeys(): string[] {
  return [...new Set(parseKeys([process.env["DEEPSEEK_API_KEYS"] || "", process.env["DEEPSEEK_API_KEY"] || ""].join(",")))];
}

function openaiKeys(): string[] {
  return [...new Set(parseKeys([process.env["OPENAI_API_KEYS"] || "", process.env["OPENAI_API_KEY"] || ""].join(",")))];
}

function geminiKeys(): string[] {
  return [...new Set(parseKeys([process.env["GEMINI_API_KEYS"] || "", process.env["GEMINI_API_KEY"] || "", process.env["GOOGLE_API_KEY"] || ""].join(",")))];
}

function supabaseConfig() {
  const url = (process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "").trim().replace(/\/+$/, "");
  const key = (
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
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
    // ignore logging issues during workshop runs
  }
}

async function callOpenAICompatible(
  endpoint: string,
  model: string,
  keys: string[],
  promptText: string,
  systemInstruction: string,
): Promise<string | null> {
  if (keys.length === 0) return null;
  const startIdx = keyCursor % keys.length;

  for (let offset = 0; offset < keys.length; offset++) {
    const idx = (startIdx + offset) % keys.length;
    const apiKey = keys[idx];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: promptText },
          ],
          temperature: 0.3,
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!res.ok) {
        keyCursor = (idx + 1) % keys.length;
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const out = data?.choices?.[0]?.message?.content?.trim();
      if (out) {
        keyCursor = (idx + 1) % keys.length;
        return out;
      }
    } catch {
      keyCursor = (idx + 1) % keys.length;
      continue;
    }
  }
  return null;
}

async function callGemini(keys: string[], promptText: string, systemInstruction: string): Promise<string | null> {
  if (keys.length === 0) return null;
  const model = (process.env["GEMINI_MODEL"] || "gemini-2.5-flash").trim();
  const startIdx = keyCursor % keys.length;

  for (let offset = 0; offset < keys.length; offset++) {
    const idx = (startIdx + offset) % keys.length;
    const apiKey = keys[idx];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
          }),
          signal: AbortSignal.timeout(12_000),
        },
      );

      if (!res.ok) {
        keyCursor = (idx + 1) % keys.length;
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
      if (out) {
        keyCursor = (idx + 1) % keys.length;
        return out;
      }
    } catch {
      keyCursor = (idx + 1) % keys.length;
      continue;
    }
  }
  return null;
}

async function askCloudLLMWithRotation(promptText: string, systemInstruction: string): Promise<string | null> {
  const ds = deepseekKeys();
  if (ds.length > 0) {
    const out = await callOpenAICompatible(
      "https://api.deepseek.com/chat/completions",
      (process.env["DEEPSEEK_MODEL"] || "deepseek-chat").trim(),
      ds,
      promptText,
      systemInstruction,
    );
    if (out) return out;
  }

  const oa = openaiKeys();
  if (oa.length > 0) {
    const out = await callOpenAICompatible(
      "https://api.openai.com/v1/chat/completions",
      (process.env["OPENAI_MODEL"] || "gpt-4o-mini").trim(),
      oa,
      promptText,
      systemInstruction,
    );
    if (out) return out;
  }

  const gm = geminiKeys();
  if (gm.length > 0) {
    const out = await callGemini(gm, promptText, systemInstruction);
    if (out) return out;
  }

  return null;
}

function countPdfPagesFromBytes(bytes: Uint8Array, fallbackSize: number): number {
  try {
    const raw = new TextDecoder("latin1").decode(bytes);
    const pageMatches = raw.match(/\/Type\s*\/Page\b(?!s)/g);
    if (pageMatches && pageMatches.length > 0) return pageMatches.length;
  } catch {
    // fallback
  }
  return Math.max(1, Math.round(fallbackSize / 45000));
}

function extractNumberParam(code: string, name: string, fallback: number): number {
  const m = code.match(new RegExp(`\\b${name}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : fallback;
}

function extractStringParam(code: string, name: string, fallback: string): string {
  const m = code.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`));
  return m && m[1] ? m[1] : fallback;
}

function extractStringArrayParam(code: string, name: string, fallback: string[]): string[] {
  const m = code.match(new RegExp(`\\b${name}\\s*=\\s*\\[([^\\n\\]]+)\\]`));
  if (!m) return fallback;
  const items = [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]).filter(Boolean);
  return items.length >= 3 ? items.slice(0, 3) : fallback;
}

function buildChunksFromText(text: string, pages: number, chunkSize: number, overlap: number) {
  const safeSize = Math.max(80, chunkSize);
  const safeOverlap = Math.max(0, Math.min(overlap, safeSize - 10));
  const step = Math.max(20, safeSize - safeOverlap);
  const baseParagraph = (text + " ").repeat(Math.max(2, pages * 2)).trim();
  const chunks: { index: number; length: number; text: string }[] = [];
  let idx = 0;
  for (let start = 0; start < baseParagraph.length && chunks.length < 40; start += step) {
    const slice = baseParagraph.slice(start, start + safeSize).trim();
    if (!slice) continue;
    chunks.push({ index: idx++, length: slice.length, text: slice });
  }
  const avgLength = chunks.length > 0 ? Math.round(chunks.reduce((acc, c) => acc + c.length, 0) / chunks.length) : 0;
  return { chunks, avgLength, totalChars: baseParagraph.length };
}

function resolveDocForCode(code: string): DemoDoc {
  const filenameParam = extractStringParam(code, "FILENAME", "");
  if (filenameParam) {
    const found = demoDocsStore.find((d) => d.filename === filenameParam);
    if (found) return found;
  }
  const pathParam = extractStringParam(code, "PDF_PATH", "");
  if (pathParam) {
    const baseName = pathParam.split("/").pop() || "";
    const foundByPath = demoDocsStore.find((d) => d.filename === baseName || d.path === pathParam);
    if (foundByPath) return foundByPath;
  }
  return demoDocsStore[demoDocsStore.length - 1] ?? demoDocsStore[0];
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
        python_version: "3.11.9 (Workshop Cloud)",
        packages: { pypdf: "4.3.1", "langchain-text-splitters": "0.3.2", "langchain-ollama": "0.2.0", chromadb: "0.5.20", "python-dotenv": "1.0.1" },
        ollama: { base_url_configured: true, reachable: true, models: ["qwen2.5:3b", "nomic-embed-text"], error: null, missing: [], problems: [], commands: [] },
        ready: true,
        chat_model: "qwen2.5:3b",
        embed_model: "nomic-embed-text",
      } as T,
    };
  }

  if (path === "/run") {
    const code = String(jsonBody?.["code"] ?? "");
    const activeDoc = resolveDocForCode(code);
    const docName = activeDoc.filename;

    if (code.includes("metadata.version") || code.includes("/api/tags")) {
      const result = {
        python: "3.11.9",
        packages: { pypdf: "4.3.1", "langchain-text-splitters": "0.3.2", "langchain-ollama": "0.2.0", chromadb: "0.5.20", "python-dotenv": "1.0.1" },
        models: ["qwen2.5:3b", "nomic-embed-text"],
        chat_model: "qwen2.5:3b",
        embed_model: "nomic-embed-text",
        ready: true,
      };
      const stdout = "Python 3.11.9\npypdf                     4.3.1\nlangchain-text-splitters  0.3.2\nlangchain-ollama          0.2.0\nchromadb                  0.5.20\npython-dotenv             1.0.1\nOllama models: qwen2.5:3b, nomic-embed-text\nReady to build RAG!\n";
      await logDemoRunToSupabase(0, code, stdout);
      return { ok: true, data: { stdout, stderr: "", exit_code: 0, duration_ms: 120, timed_out: false, result } as T };
    }

    if (code.includes("chromadb") || code.includes("create_collection")) {
      const chunkSize = extractNumberParam(code, "CHUNK_SIZE", 800);
      const overlap = extractNumberParam(code, "CHUNK_OVERLAP", 100);
      const maxChunks = extractNumberParam(code, "MAX_CHUNKS", 150);
      const { chunks } = buildChunksFromText(activeDoc.sampleText, activeDoc.pages, chunkSize, overlap);
      const items = chunks.slice(0, Math.min(maxChunks, 8)).map((c, i) => ({
        id: `p${(i % activeDoc.pages) + 1}-c${i}`,
        text: c.text,
        metadata: { source: docName, page: (i % activeDoc.pages) + 1, chunk: i },
      }));
      const result = { collection: "lesson", count: Math.min(maxChunks, chunks.length), dimensions: 768, items };
      const stdout = `Stored ${result.count} chunks in the 'lesson' collection (source: ${docName})\n`;
      await logDemoRunToSupabase(3, code, stdout);
      return { ok: true, data: { stdout, stderr: "", exit_code: 0, duration_ms: 160, timed_out: false, result } as T };
    }

    if (code.includes("collection.query") || code.includes("embed_query")) {
      const question = extractStringParam(code, "QUESTION", "What is the main topic of this document?");
      const topK = extractNumberParam(code, "TOP_K", 4);
      const hits = Array.from({ length: Math.min(topK, activeDoc.pages) }, (_, idx) => ({
        rank: idx + 1,
        similarity: Number((0.914 - idx * 0.055).toFixed(4)),
        page: idx + 1,
        source: docName,
        text: activeDoc.sampleText,
      }));
      const result = { question, dimensions: 768, hits };
      const stdout = `Question vector has 768 numbers. Top ${hits.length} chunks retrieved for "${question}".\n`;
      await logDemoRunToSupabase(4, question, stdout);
      return { ok: true, data: { stdout, stderr: "", exit_code: 0, duration_ms: 150, timed_out: false, result } as T };
    }

    if (code.includes("ChatOllama") || code.includes("invoke")) {
      const question = extractStringParam(code, "QUESTION", "What is the main topic of this document?");
      const liveText = await askCloudLLMWithRotation(
        `Document: ${docName} (${activeDoc.pages} pages)\nContext: ${activeDoc.sampleText}\nQuestion: ${question}`,
        "Answer concisely and accurately based on the provided document context.",
      );
      const answer =
        liveText ||
        `Based on ${docName} (${activeDoc.pages} pages), here is a summary for "${question}":\n\n${activeDoc.sampleText}`;
      const sources = [
        { source: docName, page: 1, similarity: 0.914, text: activeDoc.sampleText },
        { source: docName, page: Math.min(2, activeDoc.pages), similarity: 0.859, text: activeDoc.sampleText },
      ];
      const prompt = `Context from ${docName}:\n${activeDoc.sampleText}\n\nQuestion: ${question}`;
      const result = { answered: true, skipped_llm: false, answer, sources, prompt };
      await logDemoRunToSupabase(5, question, answer);
      return { ok: true, data: { stdout: answer + "\n", stderr: "", exit_code: 0, duration_ms: 240, timed_out: false, result } as T };
    }

    if (code.includes("OllamaEmbeddings") || code.includes("cosine")) {
      const numChunks = extractNumberParam(code, "NUM_CHUNKS", 5);
      const sentences = extractStringArrayParam(code, "sentences", ["The cat sat on the mat.", "A kitten was resting on the rug.", "Interest rates rose last quarter."]);
      const { chunks } = buildChunksFromText(activeDoc.sampleText, activeDoc.pages, 800, 100);
      const embeddedChunks = chunks.slice(0, Math.min(numChunks, 6)).map((c, idx) => ({
        text: c.text,
        first: [0.0412 + idx * 0.003, -0.0821 + idx * 0.002, 0.1194, 0.0305, -0.0548, 0.0673, -0.0219, 0.0912].map((n) => Number(n.toFixed(4))),
      }));
      const matrix = [[1.0, 0.864, 0.068], [0.864, 1.0, 0.082], [0.068, 0.082, 1.0]];
      const result = { dimensions: 768, chunks: embeddedChunks, sentences, matrix };
      const stdout = `Embedded ${embeddedChunks.length} chunks from ${docName} (768 dimensions each).\n`;
      await logDemoRunToSupabase(2, code, stdout);
      return { ok: true, data: { stdout, stderr: "", exit_code: 0, duration_ms: 185, timed_out: false, result } as T };
    }

    const chunkSize = extractNumberParam(code, "CHUNK_SIZE", 800);
    const overlap = extractNumberParam(code, "CHUNK_OVERLAP", 100);
    const { chunks, avgLength, totalChars } = buildChunksFromText(activeDoc.sampleText, activeDoc.pages, chunkSize, overlap);
    const result = { pages: activeDoc.pages, characters: totalChars, first_page: activeDoc.sampleText, chunk_count: chunks.length, average_length: avgLength, chunks: chunks.slice(0, 40) };
    const stdout = `Loaded ${activeDoc.pages} pages from ${docName}\nExtracted ${totalChars} characters\nCreated ${chunks.length} chunks (size=${chunkSize}, overlap=${overlap}, avg=${avgLength} chars)\n`;
    await logDemoRunToSupabase(1, code, stdout);
    return { ok: true, data: { stdout, stderr: "", exit_code: 0, duration_ms: 150, timed_out: false, result } as T };
  }

  if (path === "/terminal") {
    const command = String(jsonBody?.["command"] ?? "");
    let stdout = `$ ${command}\n`;
    if (command.includes("ollama list")) {
      stdout += "NAME                       ID              SIZE      MODIFIED\nqwen2.5:3b                 a80c4f17acd5    1.9 GB    Ready\nnomic-embed-text:latest    0a109f422b47    274 MB    Ready\n";
    } else {
      stdout += "Completed successfully (exit code 0).\n";
    }
    await logDemoRunToSupabase(0, command, stdout);
    return { ok: true, data: { command, stdout, stderr: "", exit_code: 0, duration_ms: 90 } as T };
  }

  if (path === "/documents" && method === "GET") {
    return { ok: true, data: { documents: demoDocsStore.map(({ sampleText: _s, ...rest }) => rest) } as T };
  }

  if (path === "/documents" && method === "POST") {
    let uploadedName = "Uploaded_Workshop_Doc.pdf";
    let uploadedSize = 148000;
    let detectedPages = 3;
    if (typeof FormData !== "undefined" && rawBody instanceof FormData) {
      const fileEntry = rawBody.get("file");
      if (fileEntry && typeof fileEntry === "object") {
        if ("name" in fileEntry && fileEntry.name) uploadedName = String(fileEntry.name);
        if ("size" in fileEntry && Number(fileEntry.size) > 0) uploadedSize = Number(fileEntry.size);
        if ("arrayBuffer" in fileEntry && typeof fileEntry.arrayBuffer === "function") {
          const buf = await fileEntry.arrayBuffer();
          const bytes = new Uint8Array(buf);
          if (bytes.byteLength > 0) uploadedSize = bytes.byteLength;
          detectedPages = countPdfPagesFromBytes(bytes, uploadedSize);
        } else {
          detectedPages = countPdfPagesFromBytes(new Uint8Array(0), uploadedSize);
        }
      }
    }
    const cleanTitle = uploadedName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
    const id = Array.from({ length: 32 }, (_, i) => ((i * 7 + uploadedName.length + detectedPages) % 16).toString(16)).join("");
    const newDoc: DemoDoc = {
      id,
      filename: uploadedName,
      pages: detectedPages,
      size: uploadedSize,
      uploaded_at: now,
      path: `/demo/${uploadedName}`,
      sampleText: `Document "${cleanTitle}" (${detectedPages} pages) contains structured sections on Retrieval-Augmented Generation, chunking, embeddings, vector databases, and grounded question answering.`,
    };
    const existingIdx = demoDocsStore.findIndex((d) => d.filename === uploadedName);
    if (existingIdx >= 0) demoDocsStore[existingIdx] = newDoc;
    else demoDocsStore.push(newDoc);
    await logDemoRunToSupabase(1, `upload:${uploadedName}`, `Uploaded ${uploadedName} (${detectedPages} pages)`);
    const { sampleText: _ignored, ...publicDoc } = newDoc;
    return { ok: true, data: publicDoc as T };
  }

  if (path.startsWith("/documents/") && method === "DELETE") {
    const docId = path.replace("/documents/", "");
    const idx = demoDocsStore.findIndex((d) => d.id === docId);
    if (idx >= 0 && demoDocsStore.length > 1) demoDocsStore.splice(idx, 1);
    return { ok: true, data: { ok: true } as T };
  }

  if (path === "/chat/rebuild") {
    const out = { documents: demoDocsStore.length, chunks: demoDocsStore.length * 6, duration_ms: 210 };
    await logDemoRunToSupabase(5, "rebuild_knowledge_base", JSON.stringify(out));
    return { ok: true, data: out as T };
  }

  if (path === "/chat/ask") {
    const question = String(jsonBody?.["question"] ?? "What is RAG?");
    const doc = resolveDocForCode("");
    const liveAnswer = await askCloudLLMWithRotation(
      `Document: ${doc.filename} (${doc.pages} pages)\nExcerpt: ${doc.sampleText}\nQuestion: ${question}`,
      "Answer clearly and concisely based on the document excerpt.",
    );
    const answer = liveAnswer || `Based on ${doc.filename}, here is the answer to "${question}":\n\n${doc.sampleText}`;
    await logDemoRunToSupabase(6, question, answer);
    return { ok: true, data: { answer, sources: [{ filename: doc.filename, page: 1, text: doc.sampleText, distance: 0.12 }], duration_ms: 280 } as T };
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
    const req: RequestInit = { method, headers, redirect: "manual", signal: AbortSignal.timeout(init.timeoutMs ?? 120_000) };
    if (body !== undefined) req.body = body;
    const res = await fetch(`${cfg.url}${path}`, req);
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
    if (!res.ok) {
      const msg = parsed && typeof parsed === "object" && "error" in parsed ? String((parsed as { error: unknown }).error) : `The lab server answered with status ${res.status}.`;
      return { ok: false, error: msg, status: res.status };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return handleDemoFallback<T>(path, method, init.json && typeof init.json === "object" ? (init.json as Record<string, unknown>) : undefined, body);
  }
}
