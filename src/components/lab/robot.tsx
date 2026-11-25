import normal from "@/assets/robot/rag-normal.png";
import happy from "@/assets/robot/rag-happy.png";
import angry from "@/assets/robot/rag-angry.png";
import { cn } from "@/lib/utils";

export type Mood = "normal" | "happy" | "angry";

const SRC: Record<Mood, string> = { normal: normal, happy: happy, angry: angry };
const ALT: Record<Mood, string> = {
  normal: "RAG LAB robot",
  happy: "RAG LAB robot smiling",
  angry: "RAG LAB robot, not quite right",
};

export function RobotImage({ mood, className }: { mood: Mood; className?: string }) {
  return <img key={mood} src={SRC[mood]} alt={ALT[mood]} className={cn("animate-pop select-none object-contain", className)} draggable={false} />;
}

export function Robot({
  mood = "normal",
  message,
  size = "md",
  stacked = false,
  className,
}: {
  mood?: Mood;
  message?: string;
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  className?: string;
}) {
  const img = size === "lg" ? "h-44 sm:h-56" : size === "sm" ? "h-16" : "h-28";
  return (
    <div className={cn("flex gap-2", stacked ? "flex-col items-start" : "items-end", className)}>
      <RobotImage mood={mood} className={cn(img, "w-auto shrink-0 animate-float")} />
      {message && (
        <div
          key={message}
          role="status"
          className={cn(
            "relative max-w-[15rem] animate-rise rounded-2xl border bg-card px-3.5 py-2.5 text-sm font-medium shadow-card",
            stacked ? "ml-4" : "mb-6",
            mood === "happy" && "border-success/40",
            mood === "angry" && "border-destructive/40",
          )}
        >
          <span
            className={cn("absolute size-3 rotate-45 bg-card", stacked ? "-top-1.5 left-6 border-l border-t" : "-left-1.5 bottom-3 border-b border-l")}
            aria-hidden="true"
          />
          {message}
        </div>
      )}
    </div>
  );
}
