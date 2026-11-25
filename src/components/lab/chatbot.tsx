import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Eraser, Hammer, Loader2, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  askChat,
  clearChatHistory,
  deleteDocument,
  getChatHistory,
  rebuildKnowledge,
  resetSession,
  type ChatMessage,
} from "@/lib/lab.functions";
import { cn } from "@/lib/utils";
import { docsKey, UploadButton, useDocuments } from "./documents";
import { LabError, NotConnected } from "./not-connected";

export function Chatbot({ sessionId, onAnswered }: { sessionId: string; onAnswered: () => void }) {
  const qc = useQueryClient();
  const docs = useDocuments(sessionId);
  const historyKey = ["lab", "chat", sessionId];
  const history = useQuery({ queryKey: historyKey, queryFn: () => getChatHistory({ data: { sessionId } }) });
  const [chunkSize, setChunkSize] = useState(800);
  const [overlap, setOverlap] = useState(100);
  const [topK, setTopK] = useState(4);
  const [question, setQuestion] = useState("");
  const [built, setBuilt] = useState<{ documents: number; chunks: number } | null>(null);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const docList = docs.data?.ok ? docs.data.data.documents : [];
  const messages: ChatMessage[] = history.data?.ok ? history.data.data.messages : [];

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, pending]);

  const rebuild = useMutation({
    mutationFn: async () => {
      const r = await rebuildKnowledge({ data: { sessionId, chunkSize, chunkOverlap: overlap } });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (d) => {
      setBuilt(d);
      setStale(false);
      toast.success(`Knowledge base built: ${d.chunks} chunks from ${d.documents} PDF${d.documents === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Build failed"),
  });

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const r = await askChat({ data: { sessionId, question: q, topK } });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onMutate: (q) => setPending(q),
    onSuccess: () => {
      onAnswered();
      qc.invalidateQueries({ queryKey: historyKey });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't get an answer"),
    onSettled: () => setPending(null),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    ask.mutate(q);
  }

  if (docs.data && !docs.data.ok) return docs.data.notConfigured ? <NotConnected /> : <LabError message={docs.data.error} />;

  return (
    <div className="grid min-w-0 max-w-full gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* Knowledge base */}
      <div className="min-w-0 max-w-full space-y-4">
        <div className="min-w-0 max-w-full rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">1. Your documents</p>
          {docList.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Add one or more PDFs.</p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {docList.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate" title={d.filename}>{d.filename}</span>
                  <span className="text-xs text-muted-foreground">{d.pages}p</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Remove ${d.filename}`}
                    onClick={async () => {
                      const r = await deleteDocument({ data: { sessionId, id: d.id } });
                      if (!r.ok) { toast.error(r.error); return; }
                      setStale(true);
                      qc.invalidateQueries({ queryKey: docsKey(sessionId) });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <UploadButton sessionId={sessionId} multiple onUploaded={() => setStale(true)} />
        </div>

        <div className="min-w-0 max-w-full rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">2. Build knowledge base</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kb-size" className="text-xs">Chunk size</Label>
              <Input id="kb-size" type="number" min={100} max={4000} step={50} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kb-overlap" className="text-xs">Overlap</Label>
              <Input id="kb-overlap" type="number" min={0} max={2000} step={10} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} />
            </div>
          </div>
          {overlap >= chunkSize && <p className="mt-2 text-xs text-destructive">Overlap must be smaller than chunk size.</p>}
          <Button
            variant="hero"
            className="mt-3 w-full"
            disabled={rebuild.isPending || docList.length === 0 || overlap >= chunkSize || chunkSize < 100}
            onClick={() => rebuild.mutate()}
          >
            {rebuild.isPending ? <Loader2 className="animate-spin" /> : <Hammer />}
            {rebuild.isPending ? "Building… (can take a minute)" : built ? "Rebuild knowledge base" : "Build knowledge base"}
          </Button>
          {built && !stale && <p className="mt-2 text-xs text-success">Ready: {built.chunks} chunks from {built.documents} PDF(s).</p>}
          {stale && <p className="mt-2 text-xs text-warning-foreground">Documents changed — rebuild so the chatbot knows about them.</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={messages.length === 0}
            onClick={async () => {
              const r = await clearChatHistory({ data: { sessionId } });
              if (!r.ok) { toast.error(r.error); return; }
              qc.invalidateQueries({ queryKey: historyKey });
            }}
          >
            <Eraser /> Clear conversation
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 /> Delete all my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your lab data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your PDFs, vectors and chat history from this computer. Your stage progress stays.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const r = await resetSession({ data: { sessionId } });
                    if (!r.ok) { toast.error(r.error); return; }
                    setBuilt(null);
                    qc.invalidateQueries({ queryKey: ["lab"] });
                    toast.success("Your lab data was deleted");
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Chat */}
      <div className="flex min-h-[28rem] min-w-0 max-w-full flex-col rounded-xl border bg-muted/40">
        <div className="min-w-0 max-w-full flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: "34rem" }}>
          {messages.length === 0 && !pending && (
            <div className="grid h-full place-items-center py-16 text-center text-sm text-muted-foreground">
              <div>
                <Bot className="mx-auto mb-2 size-8 text-primary" />
                Build your knowledge base, then ask a question about your PDFs.
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {pending && (
            <>
              <Bubble m={{ role: "user", content: pending, sources: [], at: "" }} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching your documents and asking llama3.2…
              </div>
            </>
          )}
          <div ref={end} />
        </div>
        <form onSubmit={submit} className="flex min-w-0 items-center gap-2 border-t bg-card p-3">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your documents..." maxLength={4000} aria-label="Your question" className="min-w-0 flex-1" />
          <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
            Top-K
            <Input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="h-9 w-14 shrink-0 sm:w-16" />
          </label>
          <Button type="submit" variant="hero" size="icon" className="shrink-0" disabled={!question.trim() || !!pending} aria-label="Send">
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const user = m.role === "user";
  return (
    <div className={cn("flex min-w-0 max-w-full gap-2", user && "flex-row-reverse")}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", user ? "bg-primary text-primary-foreground" : "bg-card text-primary shadow-sm")}>
        {user ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn("min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", user ? "bg-primary text-primary-foreground" : "bg-card shadow-sm")}>
        <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
        {!user && m.sources.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-semibold text-primary">
              Sources: {Array.from(new Set(m.sources.map((s) => `${s.filename} p.${s.page}`))).join(" · ")}
            </summary>
            <ul className="mt-2 space-y-2">
              {m.sources.map((s, i) => (
                <li key={i} className="min-w-0 max-w-full rounded-lg bg-muted p-2">
                  <p className="font-semibold">
                    <span className="break-words">{s.filename}</span> · page {s.page} <span className="font-mono font-normal text-muted-foreground">similarity {(1 - s.distance).toFixed(3)}</span>
                  </p>
                  <p className="mt-1 line-clamp-4 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
