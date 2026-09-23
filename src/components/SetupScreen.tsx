import { useEffect, useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions';
import { MAX_QUESTIONS, MIN_QUESTIONS } from '../lib/interview';
import { recognitionSupported } from '../lib/recognition';
import { loadVoices, rankVoices, speak, ttsSupported } from '../lib/speech';
import {
  CATEGORIES, CATEGORY_LABELS, COMPANY_STYLES, INSIGHT_FOCUS, STYLE_EMPHASIS, STYLE_LABELS,
  type Category, type CompanyStyle,
} from '../shared/types';

export interface InterviewConfig {
  count: number;
  categories: Category[];
  style: CompanyStyle;
  voice: SpeechSynthesisVoice | null;
}

interface Props {
  initial: { count: number; categories: Category[]; style: CompanyStyle; voiceName: string | null };
  aiEnabled: boolean | null;
  sessionCount: number;
  onStart: (config: InterviewConfig) => void;
  onHistory: () => void;
}

export function SetupScreen({ initial, aiEnabled, sessionCount, onStart, onHistory }: Props) {
  const [count, setCount] = useState(initial.count);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [style, setStyle] = useState<CompanyStyle>(initial.style);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string | null>(initial.voiceName);

  useEffect(() => {
    void loadVoices().then((all) => {
      const ranked = rankVoices(all);
      setVoices(ranked);
      setVoiceName((cur) => (cur && ranked.some((v) => v.name === cur) ? cur : ranked[0]?.name ?? null));
    });
  }, []);

  const voice = voices.find((v) => v.name === voiceName) ?? null;
  const available = useMemo(
    () => QUESTIONS.filter((q) => categories.includes(q.category) && (!q.styles || q.styles.includes(style))).length,
    [categories, style],
  );
  const effectiveCount = Math.min(count, available);

  const toggleCategory = (c: Category) =>
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  return (
    <div className="setup">
      <header className="setup-header">
        <div>
          <h1>PM Interview Coach</h1>
          <p className="muted">Practice a spoken product manager interview and get scored feedback.</p>
        </div>
        <button className="btn ghost" onClick={onHistory}>
          History{sessionCount > 0 ? ` (${sessionCount})` : ''}
        </button>
      </header>

      {aiEnabled === false && (
        <div className="notice">
          <strong>Sample feedback mode.</strong> No Anthropic API key found, so feedback will be rule-based
          samples. Add your key to <code>.env.local</code> and restart the app for real AI feedback.
        </div>
      )}
      {!recognitionSupported() && (
        <div className="notice warn">
          This browser can’t transcribe speech. Use <strong>Microsoft Edge</strong> or <strong>Chrome</strong>,
          or you can type your answers instead.
        </div>
      )}

      <section className="setup-section">
        <h2>How many questions?</h2>
        <div className="count-row">
          <input
            type="range"
            min={MIN_QUESTIONS}
            max={MAX_QUESTIONS}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="Number of questions"
          />
          <span className="count-value">{count}</span>
        </div>
        <p className="hint">About {Math.round(effectiveCount * 4)} minutes, plus feedback.</p>
      </section>

      <section className="setup-section">
        <h2>Question categories</h2>
        <div className="chip-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${categories.includes(c) ? ' on' : ''}`}
              aria-pressed={categories.includes(c)}
              onClick={() => toggleCategory(c)}
              title={`Scored on ${INSIGHT_FOCUS[c]}`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {categories.length === 0 && <p className="hint error">Pick at least one category.</p>}
      </section>

      <section className="setup-section">
        <h2>Company style</h2>
        <div className="style-grid">
          {COMPANY_STYLES.map((s) => (
            <button
              key={s}
              className={`style-card${style === s ? ' on' : ''}`}
              aria-pressed={style === s}
              onClick={() => setStyle(s)}
            >
              <strong>{STYLE_LABELS[s]}</strong>
              <span>{STYLE_EMPHASIS[s].split(': ')[1]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="setup-section">
        <h2>Interviewer voice</h2>
        {ttsSupported() && voices.length > 0 ? (
          <div className="voice-row">
            <select value={voiceName ?? ''} onChange={(e) => setVoiceName(e.target.value)} aria-label="Interviewer voice">
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name.replace(/^Microsoft /, '').replace(/ - English.*$/, '')} ({v.lang})
                </option>
              ))}
            </select>
            <button className="btn ghost" onClick={() => void speak('Hi, I’m Alex. Ready when you are.', voice)}>
              Test voice
            </button>
          </div>
        ) : (
          <p className="hint">No voices available. Questions will be shown as text.</p>
        )}
      </section>

      <div className="setup-footer">
        {available < count && categories.length > 0 && (
          <p className="hint">Only {available} questions match these settings, so you’ll get {available}.</p>
        )}
        <button
          className="btn primary big"
          disabled={categories.length === 0 || available === 0}
          onClick={() => onStart({ count: effectiveCount, categories, style, voice })}
        >
          Start interview
        </button>
      </div>
    </div>
  );
}
