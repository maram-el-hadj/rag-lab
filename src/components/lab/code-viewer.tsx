import { Fragment, useState, type ReactNode } from "react";
import { Info, MousePointerClick } from "lucide-react";
import { fillTokens, lineNote, lineText, type CodeBlock, type ParamValues } from "@/lib/stages";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set([
  "import", "from", "as", "def", "return", "for", "in", "if", "else", "elif", "try", "except", "with", "not", "and", "or", "None", "True", "False", "pass", "print", "lambda",
]);

/** Tiny Python highlighter: strings, comments, numbers, keywords. */
function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(#.*$)|([fr]?"""[\s\S]*?(?:"""|$)|[fr]?"(?:\\.|[^"\\])*"?|[fr]?'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const [t] = m;
    if (m[1]) out.push(<span key={i++} className="italic text-code-muted">{t}</span>);
    else if (m[2]) out.push(<span key={i++} className="text-stage-3">{t}</span>);
    else if (m[3]) out.push(<span key={i++} className="text-stage-0">{t}</span>);
    else if (m[4] && KEYWORDS.has(t)) out.push(<span key={i++} className="font-semibold text-accent">{t}</span>);
    else out.push(t);
    last = m.index + t.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export function CodeLesson({ blocks, values }: { blocks: CodeBlock[]; values: ParamValues }) {
  const [selected, setSelected] = useState<{ b: number; l: number } | null>(null);
  const sel = selected ? blocks[selected.b]?.lines[selected.l] : undefined;
  const note = sel ? lineNote(sel) : null;
  let lineNo = 0;

  return (
    <div className="grid min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 max-w-full space-y-5">
        {blocks.map((block, bi) => (
          <div key={block.title}>
            <h4 className="flex items-center gap-2 text-base font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-secondary font-mono text-xs text-secondary-foreground">{bi + 1}</span>
              {block.title}
            </h4>
            <p className="mb-2 mt-1 text-sm text-muted-foreground">{block.purpose}</p>
            <div className="max-w-full overflow-x-auto rounded-xl bg-code py-3 font-mono text-[13px] leading-6 text-code-foreground">
              {block.lines.map((line, li) => {
                lineNo += 1;
                const has = !!lineNote(line);
                const active = selected?.b === bi && selected.l === li;
                const text = fillTokens(lineText(line), values);
                return (
                  <Fragment key={li}>
                    <button
                      type="button"
                      onClick={() => has && setSelected({ b: bi, l: li })}
                      className={cn(
                        "flex w-full min-w-max items-start text-left",
                        has ? "cursor-pointer hover:bg-code-highlight/60" : "cursor-default",
                        active && "bg-code-highlight",
                      )}
                      aria-label={has ? `Explain line ${lineNo}` : undefined}
                      tabIndex={has ? 0 : -1}
                    >
                      <span className="w-10 shrink-0 select-none pr-3 text-right text-code-muted">{lineNo}</span>
                      <span className={cn("mr-2 mt-2.5 size-1.5 shrink-0 rounded-full", has ? "bg-accent" : "bg-transparent")} />
                      <span className="whitespace-pre pr-4">{text ? highlight(text) : " "}</span>
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <aside className="min-w-0 max-w-full lg:sticky lg:top-24 lg:self-start">
        <div className="min-w-0 max-w-full rounded-xl border bg-secondary/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
            <Info className="size-3.5" /> Line explanation
          </p>
          {sel && note ? (
            <div key={`${selected?.b}-${selected?.l}`} className="animate-rise">
              <code className="mt-3 block break-words rounded-md bg-card px-2 py-1.5 font-mono text-xs">{fillTokens(lineText(sel), values).trim()}</code>
              <p className="mt-3 text-sm leading-relaxed">{note}</p>
            </div>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <MousePointerClick className="mt-0.5 size-4 shrink-0" />
              Click a line with a blue dot to see what it does.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
