import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Server, XCircle } from "lucide-react";
import { getHealth } from "@/lib/lab.functions";
import { cn } from "@/lib/utils";

export function useHealth() {
  return useQuery({ queryKey: ["lab", "health"], queryFn: () => getHealth(), staleTime: 30_000, retry: false });
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
      <span>
        {label}
        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
      </span>
    </li>
  );
}

export function LabStatus() {
  const { data, isLoading } = useHealth();
  const h = data?.ok ? data.data : null;
  const hasModel = (name: string) => !!h && h.ollama.reachable && !h.ollama.missing.includes(name);
  const allGood = !!h && h.ready;

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Server className="size-5 text-primary" />
        <h3 className="text-base font-semibold">Lab server</h3>
        <span
          className={cn(
            "ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold",
            isLoading ? "bg-muted text-muted-foreground" : allGood ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground",
          )}
        >
          {isLoading ? "Checking…" : allGood ? "Ready" : h ? "Needs attention" : "Not connected"}
        </span>
      </div>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking the connection…
        </p>
      ) : data && !data.ok ? (
        <p className="text-sm text-muted-foreground">
          {data.notConfigured
            ? "The local Python lab server isn't running. Lessons and quizzes work, but running code waits until you start it."
            : data.error}
          {data.notConfigured && (
            <code className="mt-2 block rounded-lg bg-code px-3 py-2 font-mono text-xs text-code-foreground">start.bat &nbsp;(Windows) &nbsp;·&nbsp; ./start.sh &nbsp;(Mac / Linux)</code>
          )}
        </p>
      ) : h ? (
        <ul className="space-y-2">
          <Row ok label={`Python ${h.python_version}`} detail={`${Object.keys(h.packages).length} RAG packages installed`} />
          <Row ok={h.ollama.reachable} label="Ollama" detail={h.ollama.reachable ? `${h.ollama.models.length} model(s) installed` : (h.ollama.error ?? "Not running")} />
          <Row ok={hasModel(h.chat_model)} label={h.chat_model} detail="Chat model (writes answers)" />
          <Row ok={hasModel(h.embed_model)} label={h.embed_model} detail="Embedding model (turns text into vectors)" />
          {h.ollama.commands.length > 0 && (
            <li className="text-sm">
              <p className="mb-1 font-semibold">Run this in a terminal, then reload:</p>
              <code className="block whitespace-pre rounded-lg bg-code px-3 py-2 font-mono text-xs text-code-foreground">{h.ollama.commands.join("\n")}</code>
            </li>
          )}
          {h.ollama.reachable &&
            h.ollama.problems
              .filter((p) => !p.includes("ollama pull"))
              .map((p) => (
                <li key={p} className="text-sm text-destructive">{p}</li>
              ))}
        </ul>
      ) : null}
    </div>
  );
}
