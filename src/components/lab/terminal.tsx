import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, TerminalSquare } from "lucide-react";
import { runTerminal } from "@/lib/lab.functions";
import { cn } from "@/lib/utils";
import { NotConnected } from "./not-connected";

const SUGGESTED: { cmd: string; what: string }[] = [
  { cmd: "python --version", what: "Which Python version runs our code" },
  { cmd: "python -m venv .venv", what: "Create a virtual environment folder" },
  { cmd: "pip install pypdf langchain-text-splitters langchain-ollama chromadb python-dotenv", what: "Install the five RAG packages" },
  { cmd: "pip freeze > requirements.txt", what: "Save installed packages to a file" },
  { cmd: "cat requirements.txt", what: "Show that file" },
  { cmd: "cat .env", what: "Show our environment settings" },
  { cmd: "ollama list", what: "Models downloaded in Ollama" },
  { cmd: "ollama pull nomic-embed-text", what: "Download the embedding model" },
  { cmd: "ollama show llama3.2", what: "Details of the chat model" },
  { cmd: 'ollama run llama3.2 "Explain RAG in one sentence."', what: "Ask the LLM directly" },
];

type Entry = { command: string; stdout: string; stderr: string; exit: number | null; pending?: boolean };

export function LabTerminal({ sessionId, onSuccess }: { sessionId: string; onSuccess?: (command: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [entries]);

  async function run(command: string) {
    if (!command.trim() || busy) return;
    setBusy(true);
    setValue("");
    setEntries((e) => [...e, { command, stdout: "", stderr: "", exit: null, pending: true }]);
    const res = await runTerminal({ data: { sessionId, command } });
    setBusy(false);
    setEntries((e) => {
      const copy = e.slice(0, -1);
      if (!res.ok) {
        if (res.notConfigured) setNotConfigured(true);
        return [...copy, { command, stdout: "", stderr: res.error, exit: 1 }];
      }
      return [...copy, { command, stdout: res.data.stdout, stderr: res.data.stderr, exit: res.data.exit_code }];
    });
    if (res.ok && res.data.exit_code === 0) onSuccess?.(command);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(value);
  }

  return (
    <div className="space-y-3">
      {notConfigured && <NotConnected />}
      <div className="min-w-0 max-w-full overflow-hidden rounded-xl bg-code text-code-foreground">
        <div className="flex items-center gap-2 border-b border-code-highlight px-4 py-2 text-xs text-code-muted">
          <TerminalSquare className="size-4" /> Lab terminal — commands run on your local RAG LAB server
        </div>
        <div className="max-h-96 min-h-40 min-w-0 max-w-full overflow-x-auto overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6">
          {entries.length === 0 && <p className="text-code-muted">Type a command below or click one of the suggestions.</p>}
          {entries.map((en, i) => (
            <div key={i} className="mb-2 min-w-0 max-w-full">
              <p className="whitespace-pre">
                <span className="text-stage-3">$</span> {en.command}
              </p>
              {en.pending && (
                <p className="flex items-center gap-2 text-code-muted">
                  <Loader2 className="size-3.5 animate-spin" /> running…
                </p>
              )}
              {en.stdout && <pre className="whitespace-pre-wrap break-words">{en.stdout}</pre>}
              {en.stderr && <pre className={cn("whitespace-pre-wrap break-words", en.exit === 0 ? "text-code-muted" : "text-stage-1")}>{en.stderr}</pre>}
            </div>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-code-highlight px-4 py-2 font-mono text-[13px]">
          <span className="text-stage-3">$</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="python --version"
            aria-label="Terminal command"
            className="flex-1 bg-transparent py-1 outline-none placeholder:text-code-muted"
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={busy || !value.trim()} className="rounded-md bg-code-highlight px-3 py-1 text-xs disabled:opacity-40">
            Run
          </button>
        </form>
      </div>
      <div className="grid min-w-0 max-w-full gap-2 sm:grid-cols-2">
        {SUGGESTED.map((s) => (
          <button
            key={s.cmd}
            type="button"
            disabled={busy}
            onClick={() => run(s.cmd)}
            className="min-w-0 max-w-full rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary disabled:opacity-50"
          >
            <code className="block whitespace-normal break-words font-mono text-xs text-primary">{s.cmd}</code>
            <span className="text-xs text-muted-foreground">{s.what}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
