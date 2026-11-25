import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SECTION_TITLES = ["Introduction", "Visual explanation", "Learn the code", "Run the code", "Experiment", "Quiz", "Stage completion"];

export function Section({ n, title, children, className, aside }: { n: number; title?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section id={`step-${n}`} className={cn("surface scroll-mt-24 p-5 sm:p-7", className)}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-sky font-display text-sm font-bold text-primary-foreground">{n}</span>
        <h2 className="text-xl font-semibold sm:text-2xl">{title ?? SECTION_TITLES[n - 1]}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </header>
      {children}
    </section>
  );
}
