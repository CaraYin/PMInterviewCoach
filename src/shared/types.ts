// Types shared by the browser app and the local feedback server.
import { z } from 'zod';

export const CATEGORIES = ['product-sense', 'metrics', 'execution', 'strategy', 'behavioral'] as const;
export type Category = (typeof CATEGORIES)[number];

export const COMPANY_STYLES = ['big-tech', 'startup', 'ai'] as const;
export type CompanyStyle = (typeof COMPANY_STYLES)[number];

export interface Question {
  id: string;
  category: Category;
  text: string;
  /** Styles this question suits. Missing means it suits every style. */
  styles?: CompanyStyle[];
}

/** One answered (or skipped) question, as sent for scoring. */
export const AnswerSchema = z.object({
  questionId: z.string(),
  category: z.enum(CATEGORIES),
  question: z.string(),
  transcript: z.string(),
  durationSec: z.number(),
  skipped: z.boolean(),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const FeedbackRequestSchema = z.object({
  style: z.enum(COMPANY_STYLES),
  answers: z.array(AnswerSchema).min(1).max(10),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// ---------- Rubric ----------

export const DIMENSIONS = ['structure', 'insight', 'tradeoffs', 'communication'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  structure: 'Structure',
  insight: 'Insight',
  tradeoffs: 'Tradeoffs',
  communication: 'Communication',
};

/** What "insight" means for each category, used by both the AI prompt and the UI. */
export const INSIGHT_FOCUS: Record<Category, string> = {
  'product-sense': 'user empathy: clear target users, real pain points, and creative solutions tied to them',
  metrics: 'metric judgment: a clear goal, a well-chosen north star, supporting and guardrail metrics',
  execution: 'diagnosis and prioritization: a hypothesis-driven root-cause approach and a clear decision',
  strategy: 'market reasoning: competition, company strengths, business model, and a clear point of view',
  behavioral: 'ownership and impact: a specific situation, your own actions, and measurable results (STAR)',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  'product-sense': 'Product sense',
  metrics: 'Metrics',
  execution: 'Execution',
  strategy: 'Strategy',
  behavioral: 'Behavioral',
};

export const STYLE_LABELS: Record<CompanyStyle, string> = {
  'big-tech': 'Big tech',
  startup: 'Startup',
  ai: 'AI company',
};

/** What each company style emphasizes, used by the AI prompt and sample feedback. */
export const STYLE_EMPHASIS: Record<CompanyStyle, string> = {
  'big-tech':
    'a large tech company: rigorous structure, scale, data-driven decisions, and cross-team alignment',
  startup:
    'an early-stage startup: speed, scrappiness, customer focus, and doing more with limited resources',
  ai: 'an AI company: model capabilities and limitations, evaluation and quality, safety and trust, and cost',
};

/**
 * What Claude returns for each question: dimension scores (1–5) and written feedback.
 * The server validates responses against this schema.
 */
export const RawQuestionFeedbackSchema = z.object({
  questionId: z.string(),
  scores: z.object({
    structure: z.number(),
    insight: z.number(),
    tradeoffs: z.number(),
    communication: z.number(),
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  betterAnswerOutline: z.string(),
});

export const RawFeedbackSchema = z.object({
  questions: z.array(RawQuestionFeedbackSchema),
  overall: z.object({
    summary: z.string(),
    patterns: z.array(z.string()),
    nextFocus: z.string(),
  }),
});
export type RawFeedback = z.infer<typeof RawFeedbackSchema>;

// ---------- Final report (raw feedback + computed scores) ----------

export type FeedbackSource = 'claude' | 'sample';

export interface QuestionReport {
  questionId: string;
  scores: Record<Dimension, number>;
  /** Average of the dimension scores, 1–5, one decimal. */
  score: number;
  strengths: string[];
  improvements: string[];
  betterAnswerOutline: string;
}

export interface FeedbackReport {
  source: FeedbackSource;
  questions: QuestionReport[];
  overallScore: number;
  signal: string;
  summary: string;
  patterns: string[];
  nextFocus: string;
}
