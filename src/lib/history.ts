// Past interviews, saved in this browser's localStorage.
import type { Answer, Category, CompanyStyle, FeedbackReport } from '../shared/types';

export interface Session {
  id: string;
  date: string;
  style: CompanyStyle;
  categories: Category[];
  answers: Answer[];
  report: FeedbackReport;
}

const KEY = 'pmcoach:sessions:v1';
const MAX_SESSIONS = 50;

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  try {
    const sessions = [session, ...loadSessions().filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS);
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable: the session just isn't saved.
  }
}

export function deleteSession(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSessions().filter((s) => s.id !== id)));
  } catch {
    // ignore
  }
}

const PREFS_KEY = 'pmcoach:prefs:v1';

export interface Prefs {
  count: number;
  categories: Category[];
  style: CompanyStyle;
  voiceName: string | null;
}

export function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
