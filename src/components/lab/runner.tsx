import { useState } from "react";
import { CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { runCode, type LabDocument, type RunOutput } from "@/lib/lab.functions";
import { buildScript, type ParamValues, type Stage } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { DocumentPicker } from "./documents";
import { LabError, NotConnected } from "./not-connected";
import { keyMetrics, StageResult } from "./results";
import { Section } from "./section";

type Run = { at: number; params: ParamValues; out: RunOutput };

export function LabRunner({
  stage,
  sessionId,
  values,
  setValues,
  doc,
  setDoc,
  activityDone,
  onRunFinished,
}: {
  stage: Stage;
  sessionId: string;
  values: ParamValues;
  setValues: (v: ParamValues) => void;
  doc: LabDocument | null;
  setDoc: (d: LabDocument | null) => void;
  activityDone: boolean;
  onRunFinished: (ok: boolean) => void;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; notConfigured?: boolean } | null>(null);
  const [tab, setTab] = useState<"result" | "output">("result");
  const last = runs[runs.length - 1];
  const needsDoc = stage.needsDocument && !doc;
  const fullValues: ParamValues = doc ? { ...values, PDF_PATH: doc.path, FILENAME: doc.filename } : values;

  const invalid =
    "CHUNK_SIZE" in values && "CHUNK_OVERLAP" in values && Number(values["CHUNK_OVERLAP"]) >= Number(values["CHUNK_SIZE"])
      ? "Chunk overlap must be smaller than the chunk size."
      : null;

  async function run() {
    if (needsDoc || invalid) return;
    setBusy(true);
    setError(null);
    const res = await runCode({ data: { sessionId, code: buildScript(stage, fullValues) } });
    setBusy(false);
    if (!res.ok) {
      setError({ msg: res.error, notConfigured: !!res.notConfigured });
      onRunFinished(false);
      return;
    }
    setRuns((r) => [...r.slice(-5), { at: Date.now(), params: { ...values }, out: res.data }]);
    const ok = res.data.exit_code === 0;
    setTab(ok && res.data.result ? "result" : "output");
    onRunFinished(ok);
  }

  const runButton = (label: string) => (
    <Button variant="hero" size="lg" onClick={run} disabled={busy || needsDoc || !!invalid}>
      {busy ? <Loader2 className="animate-spin" /> : runs.length ? <RotateCcw /> : <Play />}
      {busy ? "Running on your computer…" : label}
    </Button>
  );

  return (
    <>
      <Section
        n={4}
        aside={
          activityDone ? (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="size-4" /> Activity done
            </span>
          ) : null
        }
      >
        {stage.needsDocument && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold">1. Choose your PDF</p>
            <DocumentPicker sessionId={sessionId} selectedId={doc?.id ?? null} onSelect={setDoc} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {runButton(runs.length ? "Run again" : "Run the code")}
          <p className="text-sm text-muted-foreground">
            {needsDoc ? "Choose a PDF first." : "Runs the exact code above, in your private workspace."}
          </p>
        </div>

        {error && <div className="mt-4">{error.notConfigured ? <NotConnected /> : <LabError message={error.msg} />}</div>}

        {last && (
          <div className="mt-5 animate-rise">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  last.out.exit_code === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {last.out.timed_out ? "Timed out" : last.out.exit_code === 0 ? "Finished" : `Error (exit code ${last.out.exit_code})`}
              </span>
              <span className="text-xs text-muted-foreground">{(last.out.duration_ms / 1000).toFixed(1)} s</span>
              <div className="ml-auto flex rounded-lg bg-muted p-0.5">
                {(["result", "output"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    disabled={t === "result" && !last.out.result}
                    className={cn("rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-40", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}
                  >
                    {t === "result" ? "Results" : "Program output"}
                  </button>
                ))}
              </div>
            </div>
            {tab === "result" && last.out.result ? (
              <StageResult stage={stage.id} result={last.out.result} />
            ) : (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-code p-4 font-mono text-xs leading-5 text-code-foreground">
                {last.out.stdout || (last.out.stderr ? "" : "(no output)")}
                {last.out.stderr && <span className="text-stage-1">{last.out.stderr}</span>}
              </pre>
            )}
          </div>
        )}
      </Section>

      {stage.params.length > 0 && (
        <Section n={5}>
          <p className="mb-4 text-sm text-muted-foreground">Change a value, run again, and compare the results in the table below. The code above updates as you change values.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {stage.params.map((p) => (
              <div key={p.key} className={cn("space-y-2", p.kind === "text" && "sm:col-span-2")}>
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={`p-${p.key}`}>{p.label}</Label>
                  <code className="font-mono text-xs text-muted-foreground">{p.key}</code>
                </div>
                {p.kind === "number" ? (
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[Number(values[p.key])]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onValueChange={([v]) => setValues({ ...values, [p.key]: Number(v) })}
                      className="flex-1"
                      aria-label={p.label}
                    />
                    <Input
                      id={`p-${p.key}`}
                      type="number"
                      value={values[p.key]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) setValues({ ...values, [p.key]: Math.min(p.max, Math.max(p.min, v)) });
                      }}
                      className="w-24"
                    />
                  </div>
                ) : (
                  <Input
                    id={`p-${p.key}`}
                    value={String(values[p.key])}
                    maxLength={500}
                    onChange={(e) => setValues({ ...values, [p.key]: e.target.value })}
                  />
                )}
                <p className="text-xs text-muted-foreground">{p.help}</p>
              </div>
            ))}
          </div>
          {invalid && <p className="mt-3 text-sm text-destructive">{invalid}</p>}
          <div className="mt-5">{runButton("Run with these values")}</div>

          {runs.filter((r) => r.out.exit_code === 0).length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-sm font-semibold">Compare your runs</p>
              <table className="w-full min-w-max text-left text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2">Run</th>
                    {stage.params.map((p) => (
                      <th key={p.key} className="px-3 py-2">{p.label}</th>
                    ))}
                    {Object.keys(keyMetrics(stage.id, last?.out.result ?? null)).map((k) => (
                      <th key={k} className="px-3 py-2 text-primary">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs
                    .filter((r) => r.out.exit_code === 0)
                    .map((r, i, all) => (
                      <tr key={r.at} className={cn("border-t", i === all.length - 1 && "bg-secondary/50 font-semibold")}>
                        <td className="px-3 py-2">#{i + 1}</td>
                        {stage.params.map((p) => (
                          <td key={p.key} className="max-w-48 truncate px-3 py-2">{String(r.params[p.key])}</td>
                        ))}
                        {Object.values(keyMetrics(stage.id, r.out.result)).map((v, j) => (
                          <td key={j} className="max-w-72 truncate px-3 py-2">{v}</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
