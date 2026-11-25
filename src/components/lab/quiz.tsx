import { useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PASS_SCORE } from "@/lib/session";
import type { QuizQuestion } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { RobotImage, type Mood } from "./robot";

export function Quiz({
  questions,
  bestScore,
  onAnswer,
  onFinish,
}: {
  questions: QuizQuestion[];
  bestScore: number | null;
  onAnswer: (correct: boolean) => void;
  onFinish: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = questions[index]!;
  const answered = picked !== null;
  const correct = picked === q.answer;
  const mood: Mood = !answered ? "normal" : correct ? "happy" : "angry";

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setScore((s) => s + 1);
    onAnswer(ok);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      setFinished(true);
      onFinish(score);
    }
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const passed = score >= PASS_SCORE;
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:text-left">
        <RobotImage mood={passed ? "happy" : "angry"} className="h-28 w-auto" />
        <div className="flex-1">
          <p className="font-display text-4xl font-bold">
            {score}/{questions.length}
          </p>
          <p className="mt-1 text-muted-foreground">
            {passed ? "Quiz passed! Great job." : `You need at least ${PASS_SCORE} correct answers to pass. Read the explanations and try again.`}
          </p>
          <Button variant={passed ? "soft" : "hero"} className="mt-3" onClick={restart}>
            <RotateCcw /> {passed ? "Retake quiz" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Question {index + 1} of {questions.length}
          <span className="flex gap-1">
            {questions.map((_, i) => (
              <span key={i} className={cn("h-1.5 w-6 rounded-full", i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-muted")} />
            ))}
          </span>
          {bestScore !== null && <span className="ml-auto">Best score: {bestScore}/3</span>}
        </div>
        <p className="text-lg font-semibold">{q.q}</p>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label={q.q}>
          {q.options.map((o, i) => {
            const isAnswer = i === q.answer;
            const isPicked = i === picked;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={answered}
                onClick={() => pick(i)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors",
                  !answered && "hover:border-primary hover:bg-secondary/50",
                  answered && isAnswer && "border-success bg-success/10",
                  answered && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                  answered && !isPicked && !isAnswer && "opacity-60",
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full border font-display text-xs font-bold">{"ABCD"[i]}</span>
                <span className="flex-1">{o}</span>
                {answered && isAnswer && <CheckCircle2 className="size-5 text-success" />}
                {answered && isPicked && !isAnswer && <XCircle className="size-5 text-destructive" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={cn("mt-4 animate-rise rounded-xl p-4 text-sm", correct ? "bg-success/10" : "bg-destructive/10")}>
            <p className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>{correct ? "Correct!" : "Not quite."}</p>
            <p className="mt-1">{q.explain}</p>
            <Button className="mt-3" onClick={next}>
              {index + 1 < questions.length ? "Next question" : "See my score"} <ArrowRight />
            </Button>
          </div>
        )}
      </div>
      <div className="hidden w-32 sm:block">
        <RobotImage mood={mood} className="h-28 w-auto" />
      </div>
    </div>
  );
}
