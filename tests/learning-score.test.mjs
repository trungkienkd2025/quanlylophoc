import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  calculateLearningScoreTotal,
  normalizeComponentScore,
} from "../src/lib/scores/calculate.ts";

describe("learning score total", () => {
  it("adds theory and practice, then rounds decimal totals up", () => {
    assert.equal(calculateLearningScoreTotal(2, 2.5), 5);
    assert.equal(calculateLearningScoreTotal(4.25, 5.25), 10);
    assert.equal(calculateLearningScoreTotal("4.5", "5"), 10);
  });

  it("keeps integer totals unchanged", () => {
    assert.equal(calculateLearningScoreTotal(4, 5), 9);
    assert.equal(calculateLearningScoreTotal("10", "10"), 20);
  });

  it("treats missing or invalid component scores as incomplete total 0", () => {
    assert.equal(calculateLearningScoreTotal("", 5), 0);
    assert.equal(calculateLearningScoreTotal(5, null), 0);
    assert.equal(calculateLearningScoreTotal("abc", 5), 0);
  });

  it("keeps zero as a valid component score", () => {
    assert.equal(calculateLearningScoreTotal(0, 4.5), 5);
    assert.equal(calculateLearningScoreTotal("0", "0"), 0);
  });
});

describe("component score normalization", () => {
  it("clamps UI input to the accepted 0-10 component score range", () => {
    assert.equal(normalizeComponentScore(-1), 0);
    assert.equal(normalizeComponentScore(11), 10);
    assert.equal(normalizeComponentScore("7.5"), 7.5);
  });
});

describe("database learning-score formula", () => {
  it("keeps HK1 and final-year generated totals on the same official formula", () => {
    const setupSql = readFileSync("supabase/complete_setup.sql", "utf8");
    const migrationSql = readFileSync(
      "supabase/migrations/patch_learning_score_total_formula.sql",
      "utf8",
    );
    const officialFormulaPattern =
      /total_score numeric\(4,2\) generated always as \(\s*case\s+when theory_score is null or practice_score is null then 0\s+else ceil\(theory_score \+ practice_score\)\s+end\s*\) stored/g;

    assert.equal([...setupSql.matchAll(officialFormulaPattern)].length, 2);
    assert.equal([...migrationSql.matchAll(officialFormulaPattern)].length, 2);
  });
});
