import { useEffect, useState } from 'react';
import { Avatar3D } from './components/Avatar3D';
import { HistoryScreen } from './components/HistoryScreen';
import { InterviewScreen, type RecordedAnswer } from './components/InterviewScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { SetupScreen, type InterviewConfig } from './components/SetupScreen';
import { deleteSession, loadPrefs, loadSessions, savePrefs, saveSession, type Session } from './lib/history';
import { pickQuestions } from './lib/interview';
import { buildReport } from './shared/report';
import { generateSampleFeedback } from './shared/sampleFeedback';
import {
  CATEGORIES, type Answer, type CompanyStyle, type FeedbackReport, type Question,
} from './shared/types';

type Screen =
  | { name: 'setup' }
  | { name: 'interview'; questions: Question[]; config: InterviewConfig; key: number }
  | { name: 'analyzing'; config: InterviewConfig; answers: RecordedAnswer[]; error: string | null }
  | { name: 'results'; session: Session; audio?: Record<string, string | null> }
  | { name: 'history' };

const stripAudio = (answers: RecordedAnswer[]): Answer[] => answers.map(({ audioUrl: _unused, ...a }) => a);

async function requestFeedback(style: CompanyStyle, answers: Answer[]): Promise<FeedbackReport> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ style, answers }),
  });
  const body = (await res.json().catch(() => ({}))) as FeedbackReport & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Feedback request failed (${res.status}).`);
  return body;
}

export default function App() {
  const prefs = loadPrefs();
  const [screen, setScreen] = useState<Screen>({ name: 'setup' });
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [setupDefaults, setSetupDefaults] = useState({
    count: prefs.count ?? 3,
    categories: prefs.categories?.length ? prefs.categories : [...CATEGORIES],
    style: prefs.style ?? ('big-tech' as CompanyStyle),
    voiceName: prefs.voiceName ?? null,
  });

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json() as Promise<{ aiEnabled: boolean }>)
      .then((s) => setAiEnabled(s.aiEnabled))
      .catch(() => setAiEnabled(false));
  }, []);

  function start(config: InterviewConfig) {
    const next = {
      count: config.count,
      categories: config.categories,
      style: config.style,
      voiceName: config.voice?.name ?? null,
    };
    savePrefs(next);
    setSetupDefaults(next);
    const questions = pickQuestions(config.categories, config.style, config.count);
    setScreen({ name: 'interview', questions, config, key: Date.now() });
  }

  function finishSession(config: InterviewConfig, answers: RecordedAnswer[], report: FeedbackReport) {
    const session: Session = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      style: config.style,
      categories: config.categories,
      answers: stripAudio(answers),
      report,
    };
    saveSession(session);
    setSessions(loadSessions());
    setScreen({
      name: 'results',
      session,
      audio: Object.fromEntries(answers.map((a) => [a.questionId, a.audioUrl])),
    });
  }

  async function analyze(config: InterviewConfig, answers: RecordedAnswer[]) {
    setScreen({ name: 'analyzing', config, answers, error: null });
    try {
      finishSession(config, answers, await requestFeedback(config.style, stripAudio(answers)));
    } catch (err) {
      setScreen({ name: 'analyzing', config, answers, error: err instanceof Error ? err.message : String(err) });
    }
  }

  function applySampleFeedback(config: InterviewConfig, answers: RecordedAnswer[]) {
    const plain = stripAudio(answers);
    finishSession(config, answers, buildReport(generateSampleFeedback(config.style, plain), plain, 'sample'));
  }

  switch (screen.name) {
    case 'setup':
      return (
        <SetupScreen
          initial={setupDefaults}
          aiEnabled={aiEnabled}
          sessionCount={sessions.length}
          onStart={start}
          onHistory={() => setScreen({ name: 'history' })}
        />
      );

    case 'interview':
      return (
        <InterviewScreen
          key={screen.key}
          questions={screen.questions}
          style={screen.config.style}
          voice={screen.config.voice}
          onFinish={(answers) => void analyze(screen.config, answers)}
          onQuit={() => setScreen({ name: 'setup' })}
        />
      );

    case 'analyzing':
      return (
        <div className="analyzing">
          <div className="tile interviewer-tile small-tile">
            <div className="office-bg" aria-hidden>
              <div className="window" />
              <div className="shelf" />
            </div>
            <Avatar3D mode="thinking" />
          </div>
          {screen.error ? (
            <div className="analyzing-text">
              <h2>Couldn’t get feedback</h2>
              <p className="error">{screen.error}</p>
              <div className="header-actions">
                <button className="btn primary" onClick={() => void analyze(screen.config, screen.answers)}>
                  Try again
                </button>
                <button className="btn ghost" onClick={() => applySampleFeedback(screen.config, screen.answers)}>
                  Use sample feedback instead
                </button>
              </div>
            </div>
          ) : (
            <div className="analyzing-text">
              <h2>Reviewing your answers…</h2>
              <p className="muted">
                {aiEnabled
                  ? 'Claude is scoring each answer. This usually takes 20–60 seconds.'
                  : 'Preparing sample feedback.'}
              </p>
              <div className="dots" aria-hidden><span /><span /><span /></div>
            </div>
          )}
        </div>
      );

    case 'results':
      return (
        <ResultsScreen
          report={screen.session.report}
          answers={screen.session.answers}
          style={screen.session.style}
          date={screen.session.date}
          audio={screen.audio}
          onPracticeAgain={() => setScreen({ name: 'setup' })}
          onHistory={() => setScreen({ name: 'history' })}
        />
      );

    case 'history':
      return (
        <HistoryScreen
          sessions={sessions}
          onOpen={(session) => setScreen({ name: 'results', session })}
          onDelete={(id) => {
            deleteSession(id);
            setSessions(loadSessions());
          }}
          onBack={() => setScreen({ name: 'setup' })}
        />
      );
  }
}
