import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, buildUserMessage } from '../server/claudeFeedback';
import { QUESTIONS } from './data/questions';
import { pickQuestions } from './lib/interview';
import { buildReport, hireSignal } from './shared/report';
import { generateSampleFeedback } from './shared/sampleFeedback';
import { CATEGORIES, COMPANY_STYLES, type Answer } from './shared/types';

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const answer = (over: Partial<Answer> = {}): Answer => ({
  questionId: 'ps-1',
  category: 'product-sense',
  question: 'How would you improve Google Maps?',
  transcript: '',
  durationSec: 120,
  skipped: false,
  ...over,
});

describe('question bank', () => {
  it('has unique ids and enough questions for every category and style', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const c of CATEGORIES) {
      for (const s of COMPANY_STYLES) {
        const n = QUESTIONS.filter((q) => q.category === c && (!q.styles || q.styles.includes(s))).length;
        expect(n, `${c} / ${s}`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('pickQuestions', () => {
  it('returns the requested count without repeats, matching category and style', () => {
    const qs = pickQuestions(['metrics', 'behavioral'], 'ai', 6, seeded(7));
    expect(qs).toHaveLength(6);
    expect(new Set(qs.map((q) => q.id)).size).toBe(6);
    expect(qs.every((q) => ['metrics', 'behavioral'].includes(q.category))).toBe(true);
    expect(qs.every((q) => !q.styles || q.styles.includes('ai'))).toBe(true);
  });

  it('spreads questions evenly across categories', () => {
    const qs = pickQuestions([...CATEGORIES], 'big-tech', 5, seeded(3));
    expect(new Set(qs.map((q) => q.category)).size).toBe(5);
  });

  it('returns fewer questions when not enough match', () => {
    const qs = pickQuestions(['behavioral'], 'startup', 10, seeded(2), QUESTIONS.slice(0, 3));
    expect(qs).toHaveLength(0);
  });
});

describe('reports', () => {
  it('averages dimension scores, clamps to 1–5, and scores skipped questions as 1', () => {
    const answers = [answer({ questionId: 'a' }), answer({ questionId: 'b', skipped: true })];
    const report = buildReport(
      {
        questions: [
          {
            questionId: 'a',
            scores: { structure: 5, insight: 4, tradeoffs: 9, communication: 3 },
            strengths: ['x'],
            improvements: ['y'],
            betterAnswerOutline: 'z',
          },
        ],
        overall: { summary: 's', patterns: [], nextFocus: 'n' },
      },
      answers,
      'claude',
    );
    expect(report.questions[0].scores.tradeoffs).toBe(5);
    expect(report.questions[0].score).toBe(4.3);
    expect(report.questions[1].score).toBe(1);
    expect(report.overallScore).toBe(2.7);
    expect(report.signal).toBe('Getting there');
  });

  it('maps scores to hiring signals', () => {
    expect(hireSignal(4.5)).toBe('Strong hire');
    expect(hireSignal(3.6)).toBe('Hire');
    expect(hireSignal(2.0)).toBe('Not yet');
  });
});

describe('sample feedback', () => {
  it('rewards structured, detailed answers over short ones', () => {
    const strong = answer({
      questionId: 'strong',
      durationSec: 180,
      transcript:
        'Let me first clarify the goal. I would focus on three things. First the target user segment, commuters ' +
        'who drive daily. Their pain is unpredictable traffic and parking. Second, I would brainstorm solutions. ' +
        'However there is a tradeoff between accuracy and battery cost, and a risk around privacy. ' +
        'Third, I would prioritize parking predictions because the problem is frequent for this customer need. '.repeat(3) +
        'To summarize, I would measure success with weekly retention of commuters.',
    });
    const weak = answer({ questionId: 'weak', transcript: 'I would add more features to maps.', durationSec: 20 });
    const raw = generateSampleFeedback('big-tech', [strong, weak]);
    const report = buildReport(raw, [strong, weak], 'sample');
    expect(report.questions[0].score).toBeGreaterThan(report.questions[1].score);
    expect(report.source).toBe('sample');
    expect(raw.overall.summary).toMatch(/sample feedback/i);
  });
});

describe('Claude prompt', () => {
  it('includes the rubric, company style, and every transcript', () => {
    const req = {
      style: 'ai' as const,
      answers: [
        answer({ transcript: 'my answer about maps' }),
        answer({ questionId: 'be-1', category: 'behavioral', question: 'Tell me about a time...', skipped: true }),
      ],
    };
    const system = buildSystemPrompt(req);
    expect(system).toMatch(/AI company/);
    expect(system).toMatch(/Product sense/);
    expect(system).toMatch(/Behavioral/);
    const user = buildUserMessage(req);
    expect(user).toContain('my answer about maps');
    expect(user).toContain('(skipped)');
    expect(user).toContain('questionId="be-1"');
  });
});
