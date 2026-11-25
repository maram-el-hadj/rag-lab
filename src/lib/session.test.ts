import { beforeEach, describe, expect, it } from "vitest";
import {
  createParticipant,
  forgetParticipant,
  isUnlocked,
  markActivityDone,
  recordQuizScore,
  stageProgress,
  useParticipant,
} from "./session";

// Read the store through the same getter the hook uses.
function current() {
  return JSON.parse(window.localStorage.getItem("raglab.participant.v1") ?? "null");
}

describe("stage unlocking", () => {
  beforeEach(() => {
    forgetParticipant();
    createParticipant("Ada");
  });

  it("opening a stage does not complete it", () => {
    expect(stageProgress(current(), 0).completed).toBe(false);
    expect(isUnlocked(current(), 1)).toBe(false);
  });

  it("passing the quiz alone does not unlock the next stage", () => {
    recordQuizScore(0, 3);
    expect(isUnlocked(current(), 1)).toBe(false);
  });

  it("activity plus 1/3 on the quiz is not enough", () => {
    markActivityDone(0);
    recordQuizScore(0, 1);
    expect(isUnlocked(current(), 1)).toBe(false);
  });

  it("activity plus 2/3 on the quiz completes the stage and unlocks the next", () => {
    markActivityDone(0);
    recordQuizScore(0, 2);
    expect(stageProgress(current(), 0).completed).toBe(true);
    expect(isUnlocked(current(), 1)).toBe(true);
  });

  it("keeps the best quiz score", () => {
    recordQuizScore(0, 3);
    recordQuizScore(0, 1);
    expect(stageProgress(current(), 0).quizScore).toBe(3);
  });
});

void useParticipant;
