import { QUESTIONS } from '../data/questions';
import type { Category, CompanyStyle, Question } from '../shared/types';

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 10;

/** Suggested answer length per category, in seconds. */
export const TARGET_SECONDS: Record<Category, number> = {
  'product-sense': 300,
  metrics: 240,
  execution: 240,
  strategy: 240,
  behavioral: 150,
};

export const INTERVIEWER_NAME = 'Alex';

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks `count` questions for the chosen categories and company style, spreading them
 * evenly across categories (round-robin) and never repeating a question.
 */
export function pickQuestions(
  categories: Category[],
  style: CompanyStyle,
  count: number,
  rng: () => number = Math.random,
  bank: Question[] = QUESTIONS,
): Question[] {
  const pools = shuffle(categories, rng).map((c) =>
    shuffle(bank.filter((q) => q.category === c && (!q.styles || q.styles.includes(style))), rng),
  );
  const picked: Question[] = [];
  while (picked.length < count && pools.some((p) => p.length > 0)) {
    for (const pool of pools) {
      if (picked.length >= count) break;
      const q = pool.shift();
      if (q) picked.push(q);
    }
  }
  return picked;
}

export function introLine(style: CompanyStyle, count: number): string {
  const company = {
    'big-tech': 'a product lead at a large tech company',
    startup: 'the head of product at a fast-growing startup',
    ai: 'a product lead at an AI company',
  }[style];
  return (
    `Hi, I'm ${INTERVIEWER_NAME}, ${company}. Thanks for making the time today. ` +
    `I have ${count} ${count === 1 ? 'question' : 'questions'} for you. ` +
    `Take a moment to think before you answer, and press Start answering when you're ready.`
  );
}

const TRANSITIONS = [
  'Thank you. Let’s move on.',
  'Great, thanks. Next question.',
  'Okay, thank you. Here’s the next one.',
  'Got it. Let’s try a different area.',
];

export function transitionLine(index: number): string {
  return TRANSITIONS[index % TRANSITIONS.length];
}

export const CLOSING_LINE =
  'That’s all my questions. Thank you! Give me a moment to review your answers, and I’ll share feedback.';

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
