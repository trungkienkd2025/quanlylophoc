export type ScoreInput = string | number | null | undefined;

export function normalizeComponentScore(value: ScoreInput): number | null {
  if (value === "" || value == null) return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(10, Math.max(0, score));
}

/**
 * Official learning-score formula for HK1 and final-year scores.
 *
 * total = theory + practice; any decimal total is rounded up to the next integer.
 * Missing theory or practice returns 0. A score of 0 is a valid component score.
 */
export function calculateLearningScoreTotal(
  theory: ScoreInput,
  practice: ScoreInput,
): number {
  const theoryScore = normalizeComponentScore(theory);
  const practiceScore = normalizeComponentScore(practice);

  if (theoryScore == null || practiceScore == null) return 0;

  return Math.ceil(theoryScore + practiceScore);
}
