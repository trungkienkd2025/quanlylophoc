import assert from "node:assert/strict";
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
