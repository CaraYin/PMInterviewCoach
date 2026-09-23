import {
  DIMENSIONS, type Answer, type Dimension, type FeedbackReport, type FeedbackSource, type RawFeedback,
} from './types.ts';

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hiring-committee style label for an overall score out of 5. */
export function hireSignal(score: number): string {
  if (score >= 4.25) return 'Strong hire';
  if (score >= 3.5) return 'Hire';
  if (score >= 2.5) return 'Getting there';
  return 'Not yet';
}

/**
 * Turns raw feedback into the final report: clamps scores to 1–5, averages them,
 * and keeps questions in the order they were asked. Skipped questions score 1.
 */
export function buildReport(raw: RawFeedback, answers: Answer[], source: FeedbackSource): FeedbackReport {
  const questions = answers.map((a) => {
    const fb = raw.questions.find((q) => q.questionId === a.questionId);
    const scores = Object.fromEntries(
      DIMENSIONS.map((d) => [d, a.skipped || !fb ? 1 : clampScore(fb.scores[d])]),
    ) as Record<Dimension, number>;
    const score = round1(DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / DIMENSIONS.length);
    return {
      questionId: a.questionId,
      scores,
      score,
      strengths: fb?.strengths ?? [],
      improvements: fb?.improvements ?? (a.skipped ? ['This question was skipped.'] : []),
      betterAnswerOutline: fb?.betterAnswerOutline ?? '',
    };
  });
  const overallScore = round1(questions.reduce((sum, q) => sum + q.score, 0) / questions.length);
  return {
    source,
    questions,
    overallScore,
    signal: hireSignal(overallScore),
    summary: raw.overall.summary,
    patterns: raw.overall.patterns,
    nextFocus: raw.overall.nextFocus,
  };
}
