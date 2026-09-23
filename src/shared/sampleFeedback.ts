// Rule-based placeholder feedback, used when no Anthropic API key is set.
// It only looks at surface signals (length, pacing, keywords), so the UI labels it
// clearly as sample feedback. Real feedback comes from Claude.
import {
  CATEGORY_LABELS, STYLE_EMPHASIS, type Answer, type Category, type CompanyStyle, type RawFeedback,
} from './types.ts';

const STRUCTURE_MARKERS = [
  'first', 'second', 'third', 'finally', 'framework', 'step', 'to summarize', 'in summary',
  'let me', 'i would start', 'three things', 'two things', 'clarify',
];
const TRADEOFF_MARKERS = [
  'tradeoff', 'trade-off', 'however', 'risk', 'downside', 'on the other hand', 'prioritiz',
  'instead of', 'cost', 'versus', ' vs ', 'but ',
];
const INSIGHT_MARKERS: Record<Category, string[]> = {
  'product-sense': ['user', 'customer', 'pain', 'segment', 'persona', 'need', 'problem', 'journey'],
  metrics: ['metric', 'measure', 'north star', 'retention', 'engagement', 'conversion', 'guardrail', '%', 'percent'],
  execution: ['root cause', 'hypothes', 'data', 'segment', 'prioritiz', 'decide', 'launch', 'rollback'],
  strategy: ['market', 'competit', 'moat', 'business model', 'revenue', 'partner', 'advantage', 'position'],
  behavioral: ['situation', 'i led', 'i decided', 'result', 'impact', 'learned', 'team', 'stakeholder'],
};
const FILLERS = [' um ', ' uh ', ' like ', ' you know ', ' basically ', ' kind of ', ' sort of '];

const OUTLINES: Record<Category, string> = {
  'product-sense':
    'Clarify the goal → pick a target user segment → list their top pain points → brainstorm 3 solutions → prioritize one with reasons → define how you would measure success.',
  metrics:
    'Clarify the product goal → define the north-star metric and why → add 2–3 supporting metrics → add guardrail metrics → explain how you would act on changes.',
  execution:
    'Clarify the situation → form hypotheses (internal vs external causes) → say what data you would check first → narrow to a root cause → recommend an action and next step.',
  strategy:
    'Clarify the objective → assess the market and competitors → map it to the company’s strengths → compare 2–3 options → make a clear recommendation with risks.',
  behavioral:
    'Situation (brief context) → Task (your responsibility) → Action (what you did, using “I”) → Result (measurable impact) → What you learned.',
};

function countMarkers(text: string, markers: string[]): number {
  return markers.reduce((n, m) => n + (text.includes(m) ? 1 : 0), 0);
}

function toScore(value: number, thresholds: [number, number, number, number]): number {
  // thresholds for scores 2, 3, 4, 5
  let score = 1;
  thresholds.forEach((t, i) => {
    if (value >= t) score = i + 2;
  });
  return score;
}

export function generateSampleFeedback(style: CompanyStyle, answers: Answer[]): RawFeedback {
  const questions = answers.map((a) => {
    const text = ` ${a.transcript.toLowerCase()} `;
    const words = a.transcript.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(a.durationSec, 1) / 60;
    const wpm = words / minutes;
    const fillerRate = FILLERS.reduce((n, f) => n + text.split(f).length - 1, 0) / Math.max(words, 1);

    const structureHits = countMarkers(text, STRUCTURE_MARKERS);
    const tradeoffHits = countMarkers(text, TRADEOFF_MARKERS);
    const insightHits = countMarkers(text, INSIGHT_MARKERS[a.category]);

    const lengthScore = toScore(words, [40, 120, 220, 320]);
    const scores = {
      structure: Math.min(5, Math.max(1, Math.round((toScore(structureHits, [1, 2, 4, 6]) + lengthScore) / 2))),
      insight: Math.min(5, Math.max(1, Math.round((toScore(insightHits, [1, 2, 4, 6]) + lengthScore) / 2))),
      tradeoffs: toScore(tradeoffHits, [1, 2, 3, 5]),
      communication:
        words < 20 ? 1 : wpm >= 100 && wpm <= 180 && fillerRate < 0.03 ? 4 : wpm >= 80 && wpm <= 200 ? 3 : 2,
    };

    const strengths: string[] = [];
    const improvements: string[] = [];
    if (structureHits >= 2) strengths.push('You signposted your answer, which makes it easy to follow.');
    else improvements.push('Lay out your structure up front (e.g. “I’ll cover three things…”) before diving in.');
    if (insightHits >= 3) strengths.push(`You used the right vocabulary for a ${CATEGORY_LABELS[a.category].toLowerCase()} question.`);
    else improvements.push(`Go deeper on the core of a ${CATEGORY_LABELS[a.category].toLowerCase()} question — see the outline below.`);
    if (tradeoffHits >= 2) strengths.push('You discussed tradeoffs instead of presenting a single path.');
    else improvements.push('Name at least one tradeoff or risk and explain why you would accept it.');
    if (words < 120) improvements.push(`Your answer was short (${words} words). Aim for 2–4 minutes on this type of question.`);
    if (fillerRate >= 0.03) improvements.push('Reduce filler words (“um”, “like”, “you know”); a short pause sounds more confident.');
    if (strengths.length === 0) strengths.push('You gave an answer and kept going, which is the hardest part of practicing.');

    return {
      questionId: a.questionId,
      scores,
      strengths,
      improvements,
      betterAnswerOutline: OUTLINES[a.category],
    };
  });

  return {
    questions,
    overall: {
      summary:
        'This is sample feedback based on simple rules (answer length, pacing, and keywords), not a real ' +
        'evaluation of your ideas. Add an Anthropic API key to get detailed feedback from Claude, ' +
        `tailored to ${STYLE_EMPHASIS[style]}.`,
      patterns: [
        'Sample mode can’t judge the quality of your ideas, only surface signals like structure words and pacing.',
      ],
      nextFocus: 'Practice stating your structure in the first 20 seconds of every answer.',
    },
  };
}
