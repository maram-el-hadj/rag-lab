import { ServerOff } from "lucide-react";

export function NotConnected({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
      <ServerOff className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
      <div>
        <p className="font-semibold text-warning-foreground">Local lab server not connected</p>
        <p className="mt-0.5 text-muted-foreground">
          {message ??
            "Running code needs the local RAG LAB Python server (with Ollama and ChromaDB). Nothing is simulated here. Start it with start.bat (Windows) or ./start.sh (Mac/Linux), then try again."}
        </p>
      </div>
    </div>
  );
}

export function LabError({ message }: { message: string }) {
  return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{message}</div>;
}
