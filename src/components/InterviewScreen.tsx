import { useEffect, useRef, useState } from 'react';
import {
  CLOSING_LINE, formatTime, INTERVIEWER_NAME, introLine, TARGET_SECONDS, transitionLine,
} from '../lib/interview';
import { recognitionSupported, startRecognition, type TranscriptUpdate } from '../lib/recognition';
import { openMicrophone, startRecording, type Microphone } from '../lib/recorder';
import { speak, stopSpeaking } from '../lib/speech';
import { CATEGORY_LABELS, type Answer, type CompanyStyle, type Question } from '../shared/types';
import { Avatar3D, type AvatarMode } from './Avatar3D';

export interface RecordedAnswer extends Answer {
  audioUrl: string | null;
}

type Phase = 'intro' | 'asking' | 'ready' | 'answering' | 'review' | 'closing';

interface Props {
  questions: Question[];
  style: CompanyStyle;
  voice: SpeechSynthesisVoice | null;
  onFinish: (answers: RecordedAnswer[]) => void;
  onQuit: () => void;
}

/** useState that also keeps a ref in sync, for reading the latest value inside async flows. */
function useStateRef<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const set = (v: T) => {
    ref.current = v;
    setValue(v);
  };
  return [value, set, ref] as const;
}

export function InterviewScreen({ questions, style, voice, onFinish, onQuit }: Props) {
  const [phase, setPhase, phaseRef] = useStateRef<Phase>('intro');
  const [index, setIndex, indexRef] = useStateRef(0);
  const [typedMode, setTypedMode, typedRef] = useStateRef(!recognitionSupported());
  const [live, setLive, liveRef] = useStateRef<TranscriptUpdate>({ final: '', interim: '' });
  const [draft, setDraft, draftRef] = useStateRef('');
  const [caption, setCaption] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const mounted = useRef(false);
  const mic = useRef<Microphone | null>(null);
  const recognition = useRef<{ stop: () => string } | null>(null);
  const recording = useRef<{ stop: () => Promise<string | null> } | null>(null);
  const startedAt = useRef(0);
  const duration = useRef(0);
  const pendingAudio = useRef<string | null>(null);
  const answers = useRef<RecordedAnswer[]>([]);

  const question = questions[index];

  async function say(text: string) {
    setCaption(text);
    await speak(text, voice);
  }

  async function askQuestion(i: number, prefix?: string) {
    setPhase('asking');
    await say(prefix ? `${prefix} ${questions[i].text}` : questions[i].text);
    if (mounted.current && phaseRef.current === 'asking') setPhase('ready');
  }

  // Start: get the microphone, introduce, ask the first question. Clean up on exit.
  useEffect(() => {
    mounted.current = true;
    let current = true;
    void (async () => {
      try {
        const m = await openMicrophone();
        if (!current) {
          m.release();
          return;
        }
        mic.current = m;
      } catch {
        setNotice('Microphone unavailable, so answers won’t be recorded. Allow the microphone, or type your answers.');
        setTypedMode(true);
      }
      if (!current) return;
      await say(introLine(style, questions.length));
      if (current) await askQuestion(0);
    })();
    return () => {
      current = false;
      mounted.current = false;
      stopSpeaking();
      recognition.current?.stop();
      void recording.current?.stop();
      mic.current?.release();
      mic.current = null;
    };
    // Runs once per interview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer and mic level while answering.
  useEffect(() => {
    if (phase !== 'answering') return;
    const id = setInterval(() => {
      setElapsed((performance.now() - startedAt.current) / 1000);
      setLevel(mic.current?.level() ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  function startAnswering() {
    if (!['asking', 'ready', 'review'].includes(phaseRef.current)) return;
    stopSpeaking();
    if (pendingAudio.current) URL.revokeObjectURL(pendingAudio.current);
    pendingAudio.current = null;
    setLive({ final: '', interim: '' });
    setDraft('');
    setElapsed(0);
    startedAt.current = performance.now();
    setPhase('answering');
    if (mic.current) recording.current = startRecording(mic.current);
    if (!typedRef.current) {
      recognition.current = startRecognition(setLive, (message) => {
        setNotice(message);
        setDraft(liveRef.current.final);
        setTypedMode(true);
      });
    }
  }

  async function finishAnswer() {
    if (phaseRef.current !== 'answering') return;
    const spoken = recognition.current?.stop() ?? '';
    recognition.current = null;
    duration.current = (performance.now() - startedAt.current) / 1000;
    setDraft(typedRef.current ? draftRef.current : spoken);
    setPhase('review');
    pendingAudio.current = (await recording.current?.stop()) ?? null;
    recording.current = null;
  }

  function commit(transcript: string, skipped: boolean) {
    const q = questions[indexRef.current];
    answers.current.push({
      questionId: q.id,
      category: q.category,
      question: q.text,
      transcript,
      durationSec: skipped ? 0 : Math.round(duration.current),
      skipped,
      audioUrl: skipped ? null : pendingAudio.current,
    });
    pendingAudio.current = null;
  }

  async function finishInterview() {
    setPhase('closing');
    await say(CLOSING_LINE);
    if (mounted.current) onFinish(answers.current);
  }

  function advance() {
    const next = indexRef.current + 1;
    if (next >= questions.length) {
      void finishInterview();
      return;
    }
    setIndex(next);
    void askQuestion(next, transitionLine(next));
  }

  function nextQuestion() {
    if (phaseRef.current !== 'review') return;
    commit(draftRef.current.trim(), false);
    advance();
  }

  function skipQuestion() {
    if (!['asking', 'ready'].includes(phaseRef.current)) return;
    stopSpeaking();
    commit('', true);
    advance();
  }

  function repeatQuestion() {
    if (phaseRef.current === 'ready') void askQuestion(indexRef.current);
  }

  async function endInterview() {
    stopSpeaking();
    if (phaseRef.current === 'answering') await finishAnswer();
    if (phaseRef.current === 'review' && draftRef.current.trim()) commit(draftRef.current.trim(), false);
    if (answers.current.length === 0) onQuit();
    else void finishInterview();
  }

  // Space bar starts and finishes answers (except while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT') return;
      e.preventDefault();
      if (phaseRef.current === 'answering') void finishAnswer();
      else startAnswering();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const avatarMode: AvatarMode =
    phase === 'intro' || phase === 'asking' || phase === 'closing' ? 'speaking' : phase === 'answering' ? 'listening' : 'idle';
  const target = TARGET_SECONDS[question.category];
  const isLast = index === questions.length - 1;

  return (
    <div className="interview">
      <header className="interview-header">
        <span className="progress-label">
          {phase === 'intro' ? 'Introduction' : `Question ${index + 1} of ${questions.length}`}
        </span>
        <div className="progress-bar" aria-hidden>
          <div style={{ width: `${((index + (phase === 'review' ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
        <button className="btn ghost small" onClick={() => void endInterview()} disabled={phase === 'closing'}>
          End interview
        </button>
      </header>

      <div className="stage">
        <div className="tile interviewer-tile">
          <div className="office-bg" aria-hidden>
            <div className="window" />
            <div className="shelf" />
          </div>
          <Avatar3D mode={avatarMode} />
          <span className="nametag">{INTERVIEWER_NAME} · Interviewer</span>
          {avatarMode === 'speaking' && caption && <div className="caption">{caption}</div>}
        </div>

        <div className={`tile you-tile ${phase === 'answering' ? 'live' : ''}`}>
          <div className="you-top">
            <span className="nametag static">You</span>
            {phase === 'answering' && (
              <span className="rec-dot" aria-label="Recording">
                REC {formatTime(elapsed)}
              </span>
            )}
          </div>
          <div className="mic-meter" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={phase === 'answering' && level * 12 > i ? 'on' : ''} />
            ))}
          </div>

          {phase === 'answering' && !typedMode && (
            <div className="live-transcript" aria-live="polite">
              {live.final || live.interim ? (
                <>
                  {live.final} <span className="interim">{live.interim}</span>
                </>
              ) : (
                <span className="muted">Listening… start speaking.</span>
              )}
            </div>
          )}
          {(phase === 'answering' && typedMode) || phase === 'review' ? (
            <textarea
              className="answer-box"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={phase === 'answering' ? 'Type your answer…' : 'No speech was captured. Type your answer or re-record.'}
              aria-label="Your answer"
            />
          ) : null}
          {phase === 'review' && (
            <p className="hint">Check the transcript and fix any misheard words before moving on.</p>
          )}
          {(phase === 'asking' || phase === 'ready' || phase === 'intro') && (
            <p className="muted center">
              {phase === 'ready' ? 'Your turn. Take a moment, then press Start answering.' : `${INTERVIEWER_NAME} is speaking…`}
            </p>
          )}
          {phase === 'closing' && <p className="muted center">Great work. Wrapping up…</p>}
        </div>
      </div>

      {phase !== 'intro' && phase !== 'closing' && (
        <section className="question-card">
          <div className="question-meta">
            <span className="tag">{CATEGORY_LABELS[question.category]}</span>
            <span className="muted">Suggested length: about {Math.round(target / 60)} min</span>
          </div>
          <p className="question-text">{question.text}</p>
        </section>
      )}

      {notice && <div className="notice warn">{notice}</div>}

      <div className="interview-controls">
        {(phase === 'asking' || phase === 'ready') && (
          <>
            <button className="btn ghost" onClick={repeatQuestion} disabled={phase !== 'ready'}>
              Repeat question
            </button>
            <button className="btn primary big" onClick={startAnswering}>
              ● Start answering
            </button>
            <button className="btn ghost" onClick={skipQuestion}>
              Skip
            </button>
          </>
        )}
        {phase === 'answering' && (
          <button className="btn danger big" onClick={() => void finishAnswer()}>
            ■ Done answering
          </button>
        )}
        {phase === 'review' && (
          <>
            <button className="btn ghost" onClick={startAnswering}>
              Re-record
            </button>
            <button className="btn primary big" onClick={nextQuestion}>
              {isLast ? 'Finish interview' : 'Next question →'}
            </button>
          </>
        )}
      </div>
      {(phase === 'asking' || phase === 'ready' || phase === 'answering') && (
        <p className="hint center">Tip: press the space bar to start and stop answering.</p>
      )}
    </div>
  );
}
