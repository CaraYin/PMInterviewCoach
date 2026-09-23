// The interviewer's voice, using the browser's built-in text-to-speech.
// Also publishes speaking activity so the 3D avatar can move its mouth.

/** Read by the avatar every frame. */
export const speechActivity = {
  speaking: false,
  /** performance.now() of the last word boundary, for mouth "pulses". */
  lastWordAt: 0,
};

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Voices load asynchronously in some browsers, so wait briefly for them. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

/** English voices, best first: Edge "Natural" voices, then Google, then the rest. */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.startsWith('en-US') ? 4 : 0) +
    (/natural/i.test(v.name) ? 8 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/online/i.test(v.name) ? 1 : 0);
  return voices.filter((v) => v.lang.toLowerCase().startsWith('en')).sort((a, b) => score(b) - score(a));
}

let cancelCurrent: (() => void) | null = null;

/** Stops the interviewer mid-sentence (e.g. when the candidate starts answering). */
export function stopSpeaking(): void {
  cancelCurrent?.();
}

function estimateMs(text: string): number {
  return (text.split(/\s+/).length / 2.6) * 1000 + 400;
}

/**
 * Speaks `text` and resolves when finished or stopped. Speaks sentence by sentence,
 * because some browsers cut off long utterances. If speech isn't available, it waits
 * for roughly the time the text would take to say, so the flow still works.
 */
export function speak(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  stopSpeaking();
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

  return new Promise((resolve) => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (timer) clearTimeout(timer);
      speechActivity.speaking = false;
      cancelCurrent = null;
      resolve();
    };
    cancelCurrent = () => {
      cancelled = true;
      if (ttsSupported()) speechSynthesis.cancel();
      finish();
    };
    speechActivity.speaking = true;

    if (!ttsSupported() || !voice) {
      timer = setTimeout(finish, estimateMs(text));
      return;
    }

    const speakSentence = (i: number) => {
      if (cancelled) return;
      if (i >= sentences.length) {
        finish();
        return;
      }
      const u = new SpeechSynthesisUtterance(sentences[i]);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 1;
      u.onboundary = () => {
        speechActivity.lastWordAt = performance.now();
      };
      // Safety net: some browsers occasionally never fire onend.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => speakSentence(i + 1), estimateMs(sentences[i]) * 2 + 2000);
      u.onend = () => speakSentence(i + 1);
      u.onerror = () => speakSentence(i + 1);
      speechSynthesis.speak(u);
    };
    speakSentence(0);
  });
}
