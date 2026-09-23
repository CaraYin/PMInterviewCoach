import { useMemo } from 'react';
import type { Session } from '../lib/history';
import { CATEGORIES, CATEGORY_LABELS, STYLE_LABELS, type Category } from '../shared/types';

interface Props {
  sessions: Session[];
  onOpen: (session: Session) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

/** Average score per category across all saved interviews (skipped questions excluded). */
function categoryAverages(sessions: Session[]): { category: Category; avg: number; n: number }[] {
  return CATEGORIES.map((category) => {
    const scores = sessions.flatMap((s) =>
      s.report.questions.filter((q) => {
        const a = s.answers.find((x) => x.questionId === q.questionId);
        return a?.category === category && !a.skipped;
      }).map((q) => q.score),
    );
    return { category, n: scores.length, avg: scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0 };
  }).filter((c) => c.n > 0);
}

export function HistoryScreen({ sessions, onOpen, onDelete, onBack }: Props) {
  const averages = useMemo(() => categoryAverages(sessions), [sessions]);
  const weakest = averages.length > 1 ? [...averages].sort((a, b) => a.avg - b.avg)[0] : null;

  return (
    <div className="history">
      <header className="results-header">
        <div>
          <h1>History</h1>
          <p className="muted">Saved in this browser. {sessions.length} {sessions.length === 1 ? 'interview' : 'interviews'}.</p>
        </div>
        <button className="btn primary" onClick={onBack}>New interview</button>
      </header>

      {sessions.length === 0 ? (
        <p className="muted">No interviews yet. Finish one and it will show up here.</p>
      ) : (
        <>
          <section className="averages">
            <h2>Average score by category</h2>
            {averages.map((c) => (
              <div key={c.category} className="dim">
                <span className="dim-label">{CATEGORY_LABELS[c.category]}</span>
                <div className="dim-bar">
                  <div
                    className={c.avg >= 4 ? 'good' : c.avg >= 3 ? 'ok' : 'low'}
                    style={{ width: `${(c.avg / 5) * 100}%` }}
                  />
                </div>
                <span className="dim-value">{c.avg.toFixed(1)}</span>
                <span className="muted small">{c.n} answers</span>
              </div>
            ))}
            {weakest && (
              <p className="hint">
                Your weakest area so far is <strong>{CATEGORY_LABELS[weakest.category]}</strong>. Try an interview with
                just that category.
              </p>
            )}
          </section>

          <section className="session-list">
            {sessions.map((s) => (
              <div key={s.id} className="session-row">
                <button className="session-open" onClick={() => onOpen(s)}>
                  <span className="session-score">{s.report.overallScore.toFixed(1)}</span>
                  <span className="session-info">
                    <span>{new Date(s.date).toLocaleString()}</span>
                    <span className="muted small">
                      {STYLE_LABELS[s.style]} · {s.answers.length} questions ·{' '}
                      {s.categories.map((c) => CATEGORY_LABELS[c]).join(', ')}
                      {s.report.source === 'sample' ? ' · sample feedback' : ''}
                    </span>
                  </span>
                </button>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    if (confirm('Delete this interview from your history?')) onDelete(s.id);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
