import { describe, expect, it } from "vitest";
import { buildScript, defaultParams, fillTokens, STAGES } from "./stages";

describe("lesson scripts", () => {
  it("has seven stages, each with exactly three quiz questions", () => {
    expect(STAGES.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const s of STAGES) expect(s.quiz).toHaveLength(3);
  });

  it("inserts learner values as safe Python literals", () => {
    expect(fillTokens("Q = @@QUESTION@@", { QUESTION: 'He said "hi"' })).toBe('Q = "He said \\"hi\\""');
    expect(fillTokens("N = @@TOP_K@@", { TOP_K: 4 })).toBe("N = 4");
  });

  it("leaves no unfilled tokens once the PDF is chosen", () => {
    for (const s of STAGES.slice(0, 6)) {
      const script = buildScript(s, { ...defaultParams(s), PDF_PATH: "docs/x.pdf", FILENAME: "x.pdf" });
      expect(script).not.toMatch(/@@/);
      expect(script).not.toMatch(/not set/);
    }
  });

  it("uses llama3.2 for chat and nomic-embed-text only for embeddings", () => {
    for (const s of STAGES.slice(0, 6)) {
      const script = buildScript(s, { ...defaultParams(s), PDF_PATH: "docs/x.pdf", FILENAME: "x.pdf" });
      for (const call of script.match(/ChatOllama\(model=[^)]*\)/g) ?? []) {
        expect(call).toContain('os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")');
        expect(call).not.toContain("EMBED");
      }
      for (const call of script.match(/OllamaEmbeddings\(model=[^)]*\)/g) ?? []) {
        expect(call).toContain('os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")');
      }
    }
    expect(buildScript(STAGES[5]!, defaultParams(STAGES[5]!))).toContain("ChatOllama(model=");
  });
});
