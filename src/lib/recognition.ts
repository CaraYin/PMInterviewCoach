// Live speech-to-text using the browser's built-in speech recognition (Edge and Chrome).

// The Web Speech API isn't in TypeScript's DOM types yet, so describe the parts we use.
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionAlternativeLike }
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null;
}

export interface TranscriptUpdate {
  /** Finalized text so far. */
  final: string;
  /** Words still being recognized (may change). */
  interim: string;
}

/**
 * Starts continuous recognition. Browsers stop listening after a pause, so this
 * restarts automatically until `stop()` is called.
 */
export function startRecognition(
  onUpdate: (u: TranscriptUpdate) => void,
  onFatalError: (message: string) => void,
): { stop: () => string } {
  const Ctor = getCtor();
  if (!Ctor) {
    onFatalError('Speech recognition isn’t supported in this browser. Use Edge or Chrome, or type your answer.');
    return { stop: () => '' };
  }

  let finalText = '';
  let interimText = '';
  let active = true;
  let recognition: SpeechRecognitionLike;

  const begin = () => {
    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = `${finalText} ${piece}`.trim();
        else interimText += piece;
      }
      onUpdate({ final: finalText, interim: interimText.trim() });
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false;
        onFatalError('Microphone access was blocked. Allow the microphone for this site, or type your answer.');
      } else if (e.error === 'network') {
        active = false;
        onFatalError('Speech recognition needs an internet connection. You can type your answer instead.');
      }
      // 'no-speech' and 'aborted' are normal during pauses; onend restarts.
    };
    recognition.onend = () => {
      if (active) {
        try {
          begin();
        } catch {
          // ignore: a restart race; the next onend will retry
        }
      }
    };
    recognition.start();
  };

  try {
    begin();
  } catch (err) {
    onFatalError(`Couldn’t start speech recognition: ${String(err)}`);
  }

  return {
    stop: () => {
      active = false;
      try {
        recognition?.stop();
      } catch {
        // already stopped
      }
      // Keep words that were still "interim" when the user pressed Done.
      return `${finalText} ${interimText}`.trim();
    },
  };
}
