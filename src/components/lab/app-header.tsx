import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { useParticipant } from "@/lib/session";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-sky font-display text-sm font-extrabold text-primary-foreground shadow-soft">R</span>
      <span className="font-display text-lg font-extrabold tracking-tight">
        RAG <span className="text-gradient-sky">LAB</span>
      </span>
    </Link>
  );
}

export function AppHeader() {
  const p = useParticipant();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        {p && (
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="grid size-9 place-items-center rounded-full bg-secondary font-display text-sm font-bold text-secondary-foreground" title={p.name}>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          </nav>
        )}
      </div>
    </header>
  );
}
