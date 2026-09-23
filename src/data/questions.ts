import type { Question } from '../shared/types';

// Typical PM interview questions. `styles` limits a question to certain company styles;
// questions without it are asked in every style.
export const QUESTIONS: Question[] = [
  // ---------- Product sense ----------
  { id: 'ps-1', category: 'product-sense', text: 'How would you improve Google Maps?' },
  { id: 'ps-2', category: 'product-sense', text: 'Design a product to help elderly people live independently at home.' },
  { id: 'ps-3', category: 'product-sense', text: 'What is your favorite product, and how would you improve it?' },
  { id: 'ps-4', category: 'product-sense', text: 'Design an alarm clock for people who are deaf or hard of hearing.' },
  { id: 'ps-5', category: 'product-sense', text: 'How would you improve the experience of buying a used car?' },
  { id: 'ps-6', category: 'product-sense', text: 'Design a product that helps remote teams build stronger relationships.', styles: ['big-tech', 'startup'] },
  { id: 'ps-7', category: 'product-sense', text: 'You have one engineer and four weeks. Design the first version of a meal-planning app.', styles: ['startup'] },
  { id: 'ps-8', category: 'product-sense', text: 'Design a feature for YouTube that helps creators grow their audience.', styles: ['big-tech'] },
  { id: 'ps-9', category: 'product-sense', text: 'Design an AI assistant for small business owners. Who is it for, and what does it do first?', styles: ['ai', 'startup'] },
  { id: 'ps-10', category: 'product-sense', text: 'How would you design an AI tutor for high school students that parents and teachers trust?', styles: ['ai'] },
  { id: 'ps-11', category: 'product-sense', text: 'Pick a product that uses AI today and explain how you would make it more useful.', styles: ['ai'] },

  // ---------- Metrics ----------
  { id: 'me-1', category: 'metrics', text: 'What metrics would you use to measure the success of Instagram Stories?' },
  { id: 'me-2', category: 'metrics', text: 'You are the PM for Spotify playlists. What is your north-star metric, and why?' },
  { id: 'me-3', category: 'metrics', text: 'How would you measure the success of a new onboarding flow?' },
  { id: 'me-4', category: 'metrics', text: 'Uber rides are up 10% but revenue is flat. How would you investigate?' },
  { id: 'me-5', category: 'metrics', text: 'How would you set goals for a customer support chatbot?' },
  { id: 'me-6', category: 'metrics', text: 'Our startup has 2,000 users. Which three metrics would you track weekly, and why?', styles: ['startup'] },
  { id: 'me-7', category: 'metrics', text: 'How would you measure the quality of answers from an AI writing assistant?', styles: ['ai'] },
  { id: 'me-8', category: 'metrics', text: 'Usage of our AI feature is growing, but so is our model cost per user. Which metrics would you watch?', styles: ['ai'] },
  { id: 'me-9', category: 'metrics', text: 'How would you measure the health of the Gmail product?', styles: ['big-tech'] },
  { id: 'me-10', category: 'metrics', text: 'What would you measure to decide whether to keep a feature that 5% of users love?' },

  // ---------- Execution ----------
  { id: 'ex-1', category: 'execution', text: 'Daily active users dropped 15% overnight. Walk me through how you would investigate.' },
  { id: 'ex-2', category: 'execution', text: 'You have three high-priority features and capacity for one. How do you decide?' },
  { id: 'ex-3', category: 'execution', text: 'Engineering says your launch will slip by six weeks. What do you do?' },
  { id: 'ex-4', category: 'execution', text: 'An A/B test shows higher engagement but lower revenue. Do you ship it?' },
  { id: 'ex-5', category: 'execution', text: 'How would you plan the launch of a new feature to 100 million users?', styles: ['big-tech'] },
  { id: 'ex-6', category: 'execution', text: 'Your biggest customer demands a feature that no one else wants. How do you handle it?', styles: ['startup', 'big-tech'] },
  { id: 'ex-7', category: 'execution', text: 'Your AI feature gives a harmful answer that goes viral on social media. What do you do in the first 48 hours?', styles: ['ai'] },
  { id: 'ex-8', category: 'execution', text: 'How would you decide when an AI feature is good enough to launch?', styles: ['ai'] },
  { id: 'ex-9', category: 'execution', text: 'You have one month of runway left to show traction. What do you prioritize?', styles: ['startup'] },
  { id: 'ex-10', category: 'execution', text: 'Checkout conversion dropped 5% after a release. How do you find the cause?' },

  // ---------- Strategy ----------
  { id: 'st-1', category: 'strategy', text: 'Should Netflix launch a live sports offering? Why or why not?' },
  { id: 'st-2', category: 'strategy', text: 'How would you grow a product that has stopped growing?' },
  { id: 'st-3', category: 'strategy', text: 'A well-funded competitor just copied your core feature. What is your response?' },
  { id: 'st-4', category: 'strategy', text: 'Should Amazon enter the healthcare market? How would you decide?', styles: ['big-tech'] },
  { id: 'st-5', category: 'strategy', text: 'What is one product you think Apple should build next, and why?', styles: ['big-tech'] },
  { id: 'st-6', category: 'strategy', text: 'We are a 10-person startup. Should we focus on small businesses or enterprises first?', styles: ['startup'] },
  { id: 'st-7', category: 'strategy', text: 'How should we price a new B2B product with no direct competitors?', styles: ['startup', 'big-tech'] },
  { id: 'st-8', category: 'strategy', text: 'Foundation models keep getting cheaper and better. How does that change our product strategy?', styles: ['ai'] },
  { id: 'st-9', category: 'strategy', text: 'Should an AI company build a consumer app or focus on selling its API to developers?', styles: ['ai'] },
  { id: 'st-10', category: 'strategy', text: 'What will be the biggest change in your favorite product category over the next five years?' },

  // ---------- Behavioral ----------
  { id: 'be-1', category: 'behavioral', text: 'Tell me about a time you disagreed with an engineer. How did you resolve it?' },
  { id: 'be-2', category: 'behavioral', text: 'Tell me about a product you launched that failed. What did you learn?' },
  { id: 'be-3', category: 'behavioral', text: 'Describe a time you had to make a decision without enough data.' },
  { id: 'be-4', category: 'behavioral', text: 'Tell me about a time you influenced a team you had no authority over.' },
  { id: 'be-5', category: 'behavioral', text: 'Tell me about a time you said no to a stakeholder.' },
  { id: 'be-6', category: 'behavioral', text: 'Why do you want to be a product manager?' },
  { id: 'be-7', category: 'behavioral', text: 'Tell me about a time you had to move fast and cut scope.', styles: ['startup'] },
  { id: 'be-8', category: 'behavioral', text: 'Tell me about a time you aligned many teams around one plan.', styles: ['big-tech'] },
  { id: 'be-9', category: 'behavioral', text: 'Tell me about a time you had to learn a new technical area quickly.', styles: ['ai', 'startup'] },
  { id: 'be-10', category: 'behavioral', text: 'How do you think about the responsibility of building AI products?', styles: ['ai'] },
];
