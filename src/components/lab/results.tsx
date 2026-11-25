import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type R = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-muted">
      <span className="block h-full rounded-full bg-gradient-sky" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function StageResult({ stage, result }: { stage: number; result: R }) {
  if (stage === 0) {
    const pk = (result["packages"] ?? {}) as Record<string, string>;
    const models = arr<string>(result["models"]);
    const ready = result["ready"] === true;
    return (
      <div className="space-y-3">
        <div className={cn("flex items-center gap-2 rounded-xl p-3 text-sm font-semibold", ready ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground")}>
          {ready ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
          {ready ? "Everything is ready to build RAG!" : "A model is missing. Try `ollama pull` in the terminal."}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Python" value={str(result["python"])} />
          <Stat label="Chat model" value={str(result["chat_model"])} />
          <Stat label="Embedding model" value={str(result["embed_model"])} />
        </div>
        <table className="w-full overflow-hidden rounded-xl border text-sm">
          <tbody>
            {Object.entries(pk).map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono">{k}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <span key={m} className="rounded-full bg-secondary px-3 py-1 font-mono text-xs">{m}</span>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 1) {
    const chunks = arr<{ index: number; length: number; text: string }>(result["chunks"]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pages" value={num(result["pages"])} />
          <Stat label="Characters" value={num(result["characters"]).toLocaleString()} />
          <Stat label="Chunks" value={num(result["chunk_count"])} />
          <Stat label="Avg. chunk" value={`${num(result["average_length"])} ch`} />
        </div>
        <details className="rounded-xl border bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold">Extracted text of page 1</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{str(result["first_page"]) || "(no text on this page)"}</pre>
        </details>
        <div>
          <p className="mb-2 text-sm font-semibold">Chunks {chunks.length < num(result["chunk_count"]) && <span className="font-normal text-muted-foreground">(first {chunks.length})</span>}</p>
          <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {chunks.map((c) => (
              <div key={c.index} className="rounded-xl border bg-card p-3">
                <p className="mb-1 flex justify-between text-xs font-semibold text-primary">
                  <span>Chunk {c.index}</span>
                  <span className="text-muted-foreground">{c.length} characters</span>
                </p>
                <p className="line-clamp-5 text-xs text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 2) {
    const chunks = arr<{ text: string; first: number[] }>(result["chunks"]);
    const sentences = arr<string>(result["sentences"]);
    const matrix = arr<number[]>(result["matrix"]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Vector size" value={`${num(result["dimensions"])} numbers`} />
          <Stat label="Chunks embedded" value={chunks.length} />
        </div>
        <div className="space-y-2">
          {chunks.map((c, i) => (
            <div key={i} className="rounded-xl border bg-card p-3">
              <p className="line-clamp-2 text-xs text-muted-foreground">{c.text}</p>
              <p className="mt-1.5 overflow-x-auto whitespace-nowrap font-mono text-xs text-primary">[{c.first.join(", ")}, …]</p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Sentence similarity (cosine)</p>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th />
                  {sentences.map((_, i) => (
                    <th key={i} className="px-3 py-1 font-display">{"ABC"[i]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i}>
                    <th className="pr-3 text-left font-display">{"ABC"[i]}</th>
                    {row.map((v, j) => (
                      <td key={j} className="p-1">
                        <span
                          className="block min-w-16 rounded-md bg-primary px-2 py-1.5 text-center font-mono text-xs text-primary-foreground"
                          style={{ opacity: 0.25 + Math.max(0, v) * 0.75 }}
                        >
                          {v.toFixed(3)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {sentences.map((s, i) => (
              <li key={i}>
                <b className="text-foreground">{"ABC"[i]}:</b> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (stage === 3) {
    const items = arr<{ id: string; text: string; metadata: Record<string, unknown> }>(result["items"]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Collection" value={str(result["collection"])} />
          <Stat label="Stored chunks" value={num(result["count"])} />
          <Stat label="Vector size" value={num(result["dimensions"])} />
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">metadata</th>
                <th className="px-3 py-2">document</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t align-top">
                  <td className="px-3 py-2 font-mono">{it.id}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{JSON.stringify(it.metadata)}</td>
                  <td className="px-3 py-2 text-muted-foreground"><span className="line-clamp-3">{it.text}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (stage === 4) {
    const hits = arr<{ rank: number; similarity: number; page: number; source: string; text: string }>(result["hits"]);
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Question vector: {num(result["dimensions"])} numbers. Most similar chunks:
        </p>
        {hits.map((h) => (
          <div key={h.rank} className="rounded-xl border bg-card p-3">
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="font-display text-base font-bold text-primary">#{h.rank}</span>
              <span className="font-semibold">{h.source} · page {h.page}</span>
              <span className="ml-auto font-mono">{h.similarity.toFixed(3)}</span>
            </div>
            <Bar value={h.similarity} />
            <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{h.text}</p>
          </div>
        ))}
      </div>
    );
  }

  if (stage === 5) {
    const sources = arr<{ source: string; page: number; similarity: number; text: string }>(result["sources"]);
    return (
      <div className="space-y-3">
        <div className="rounded-xl border-l-4 border-primary bg-secondary/50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
            {result["skipped_llm"] ? "No relevant chunk found — LLM not called" : "Answer from llama3.2"}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{str(result["answer"])}</p>
        </div>
        <p className="text-sm font-semibold">{result["answered"] === false ? "Chunks that were searched (not used as sources)" : "Sources"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((s, i) => (
            <details key={i} className="rounded-xl border bg-card p-3 text-xs">
              <summary className="cursor-pointer font-semibold">
                {s.source} · page {s.page} <span className="font-mono text-muted-foreground">({s.similarity})</span>
              </summary>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </details>
          ))}
        </div>
        {str(result["prompt"]) && (
          <details className="rounded-xl border bg-card p-3">
            <summary className="cursor-pointer text-sm font-semibold">See the full prompt sent to the LLM</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{str(result["prompt"])}</pre>
          </details>
        )}
      </div>
    );
  }
  return null;
}

/** Key numbers per stage, used to compare experiment runs. */
export function keyMetrics(stage: number, r: R | null): Record<string, string> {
  if (!r) return {};
  switch (stage) {
    case 1:
      return { Chunks: String(num(r["chunk_count"])), "Avg. length": String(num(r["average_length"])) };
    case 2: {
      const m = arr<number[]>(r["matrix"]);
      return { "A↔B": m[0]?.[1]?.toFixed(3) ?? "–", "A↔C": m[0]?.[2]?.toFixed(3) ?? "–" };
    }
    case 3:
      return { "Stored chunks": String(num(r["count"])) };
    case 4: {
      const h = arr<{ similarity: number; page: number }>(r["hits"]);
      return { "Best similarity": h[0]?.similarity.toFixed(3) ?? "–", Pages: h.map((x) => x.page).join(", ") };
    }
    case 5: {
      const a = str(r["answer"]);
      return { Answer: a.length > 90 ? a.slice(0, 90) + "…" : a };
    }
    default:
      return {};
  }
}
