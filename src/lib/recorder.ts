// Microphone access, answer recording, and a live input level for the mic meter.

export interface Microphone {
  stream: MediaStream;
  /** Current input level, 0–1. */
  level: () => number;
  release: () => void;
}

export async function openMicrophone(): Promise<Microphone> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  return {
    stream,
    level: () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / data.length) * 4);
    },
    release: () => {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}

/** Records one answer. `stop()` resolves with a playable URL, or null if recording failed. */
export function startRecording(mic: Microphone): { stop: () => Promise<string | null> } {
  if (typeof MediaRecorder === 'undefined') return { stop: async () => null };
  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(mic.stream);
  } catch {
    return { stop: async () => null };
  }
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === 'inactive') {
          resolve(null);
          return;
        }
        recorder.onstop = () =>
          resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })) : null);
        recorder.stop();
      }),
  };
}
