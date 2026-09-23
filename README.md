# PM Interview Coach

Practice spoken product manager interviews with an animated 3D interviewer, then get scored feedback on every answer.

```sh
npm install
npm run dev     # http://localhost:5173 — open in Microsoft Edge or Chrome
npm test        # unit tests
npm run build   # type-check + production build
```

## How it works

1. **Setup:** choose the number of questions (1–10), question categories (product sense, metrics, execution, strategy, behavioral), a company style (big tech, startup, AI company), and the interviewer's voice.
2. **Interview:** Alex, a 3D interviewer, reads each question aloud. Press **Start answering** (or the space bar), speak, and press **Done**. Your words are transcribed live and your audio is recorded. Before moving on, you can fix misheard words or re-record.
3. **Feedback:** each answer is scored 1–5 on structure, insight, tradeoffs, and communication, with strengths, improvements, and an outline of a stronger answer. You also get an overall score, a hiring signal, patterns across answers, and what to practice next.
4. **History:** past interviews are saved in your browser, with average scores by category so you can track progress.

## Turning on AI feedback

Without an API key, the app gives **sample feedback**: rule-based scores from answer length, pacing, and keywords, clearly labeled as samples. For real feedback from Claude:

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/) (Settings → API keys).
2. Copy `.env.example` to `.env.local` and paste the key after `ANTHROPIC_API_KEY=`.
3. Restart `npm run dev`. The setup screen's "Sample feedback mode" notice disappears.

The key stays on your computer: it's read by the local dev server only, never sent to the browser, and `.env.local` is git-ignored. Feedback uses Claude Opus 5 (`claude-opus-5`) with structured JSON output. A 5-question interview costs roughly $0.10–0.20.

## Browser notes

- **Speech recognition** uses the browser's built-in engine, so it works in **Edge and Chrome** (it needs an internet connection; in Edge, audio is processed by Microsoft's speech service). In other browsers, or if the microphone is blocked, you can type answers instead.
- **The interviewer's voice** uses the browser's built-in voices. Edge's "Natural" voices sound best.
- **Recordings** can be replayed on the results screen right after an interview. They are not saved to history.

## Project layout

```
src/
  components/
    Avatar3D.tsx         3D interviewer (three.js via React Three Fiber): blinking, nodding, lip movement
    SetupScreen.tsx      Interview settings
    InterviewScreen.tsx  The interview flow: ask → answer → review → next
    ResultsScreen.tsx    Scores and feedback
    HistoryScreen.tsx    Past interviews and category averages
  data/questions.ts      Question bank (50 questions, some specific to a company style)
  lib/
    interview.ts         Question selection and interviewer lines
    speech.ts            Text-to-speech (interviewer voice)
    recognition.ts       Speech-to-text (live transcript)
    recorder.ts          Microphone, recording, and input level
    history.ts           Saved interviews and preferences (localStorage)
  shared/                Used by both the browser and the server
    types.ts             Types, rubric, and the feedback schema
    report.ts            Turns raw feedback into scores and a hiring signal
    sampleFeedback.ts    Rule-based feedback when there's no API key
server/
  apiPlugin.ts           Local API on the dev server: /api/status, /api/feedback
  claudeFeedback.ts      The Claude prompt and API call
```
