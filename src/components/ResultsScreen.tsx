import { useState } from 'react';
import { formatTime } from '../lib/interview';
import {
  CATEGORY_LABELS, DIMENSIONS, DIMENSION_LABELS, INSIGHT_FOCUS, STYLE_LABELS,
  type Answer, type CompanyStyle, type FeedbackReport,
} from '../shared/types';

interface Props {
  report: FeedbackReport;
  answers: Answer[];
  style: CompanyStyle;
  date: string;
  /** Recordings exist only for the interview you just finished (not saved to history). */
  audio?: Record<string, string | null>;
  onPracticeAgain: () => void;
  onHistory: () => void;
}

function scoreTone(score: number): string {
  return score >= 4 ? 'good' : score >= 3 ? 'ok' : 'low';
}

export function ResultsScreen({ report, answers, style, date, audio, onPracticeAgain, onHistory }: Props) {
  const [open, setOpen] = useState<string | null>(report.questions[0]?.questionId ?? null);

  return (
    <div className="results">
      <header className="results-header">
        <div>
          <h1>Your feedback</h1>
          <p className="muted">
            {new Date(date).toLocaleString()} · {STYLE_LABELS[style]} · {answers.length}{' '}
            {answers.length === 1 ? 'question' : 'questions'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={onHistory}>History</button>
          <button className="btn primary" onClick={onPracticeAgain}>Practice again</button>
        </div>
      </header>

      <span className={`source-badge ${report.source}`}>
        {report.source === 'claude' ? 'AI feedback by Claude' : 'Sample feedback (no API key): rule-based, not a real evaluation'}
      </span>

      <section className="overall">
        <div className={`score-ring ${scoreTone(report.overallScore)}`}>
          <span className="score-number">{report.overallScore.toFixed(1)}</span>
          <span className="score-max">/ 5</span>
        </div>
        <div className="overall-text">
          <p className={`signal ${scoreTone(report.overallScore)}`}>{report.signal}</p>
          <p>{report.summary}</p>
          {report.patterns.length > 0 && (
            <>
              <h3>Patterns across your answers</h3>
              <ul>{report.patterns.map((p) => <li key={p}>{p}</li>)}</ul>
            </>
          )}
          <div className="next-focus">
            <strong>Practice next:</strong> {report.nextFocus}
          </div>
        </div>
      </section>

      <section className="question-list">
        {report.questions.map((qr, i) => {
          const a = answers.find((x) => x.questionId === qr.questionId);
          if (!a) return null;
          const isOpen = open === qr.questionId;
          const url = audio?.[qr.questionId];
          return (
            <article key={qr.questionId} className={`q-card${isOpen ? ' open' : ''}`}>
              <button className="q-head" onClick={() => setOpen(isOpen ? null : qr.questionId)} aria-expanded={isOpen}>
                <span className={`q-score ${scoreTone(qr.score)}`}>{qr.score.toFixed(1)}</span>
                <span className="q-title">
                  <span className="muted small">
                    Q{i + 1} · {CATEGORY_LABELS[a.category]}
                    {a.skipped ? ' · skipped' : ` · ${formatTime(a.durationSec)}`}
                  </span>
                  <span>{a.question}</span>
                </span>
                <span className="chevron" aria-hidden>{isOpen ? '▴' : '▾'}</span>
              </button>

              {isOpen && (
                <div className="q-body">
                  <div className="dims">
                    {DIMENSIONS.map((d) => (
                      <div
                        key={d}
                        className="dim"
                        title={d === 'insight' ? `Insight for this question type: ${INSIGHT_FOCUS[a.category]}` : undefined}
                      >
                        <span className="dim-label">{DIMENSION_LABELS[d]}</span>
                        <div className="dim-bar">
                          <div className={scoreTone(qr.scores[d])} style={{ width: `${(qr.scores[d] / 5) * 100}%` }} />
                        </div>
                        <span className="dim-value">{qr.scores[d]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="fb-columns">
                    <div>
                      <h4 className="good-text">What went well</h4>
                      <ul>{qr.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="low-text">What to improve</h4>
                      <ul>{qr.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
                    </div>
                  </div>

                  {qr.betterAnswerOutline && (
                    <div className="outline">
                      <h4>A stronger answer could…</h4>
                      <p>{qr.betterAnswerOutline}</p>
                    </div>
                  )}

                  {!a.skipped && (
                    <details className="transcript">
                      <summary>Your answer</summary>
                      {url && <audio controls src={url} />}
                      <p>{a.transcript || <em>No speech captured.</em>}</p>
                    </details>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
