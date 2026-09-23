// Vite plugin that adds a tiny local API to the dev server:
//   GET  /api/status   -> whether AI feedback is available
//   POST /api/feedback -> scores the answers (Claude if a key is set, sample feedback otherwise)
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { buildReport } from '../src/shared/report.ts';
import { generateSampleFeedback } from '../src/shared/sampleFeedback.ts';
import { FeedbackRequestSchema } from '../src/shared/types.ts';
import { FeedbackError, generateClaudeFeedback, MODEL } from './claudeFeedback.ts';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error('Request too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function apiPlugin(apiKey: string | undefined): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    if (req.url === '/api/status' && req.method === 'GET') {
      sendJson(res, 200, { aiEnabled: Boolean(apiKey), model: apiKey ? MODEL : null });
      return;
    }
    if (req.url === '/api/feedback' && req.method === 'POST') {
      let parsed;
      try {
        parsed = FeedbackRequestSchema.safeParse(JSON.parse(await readBody(req)));
      } catch {
        sendJson(res, 400, { error: 'Invalid request body.' });
        return;
      }
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid request: ' + parsed.error.message });
        return;
      }
      const request = parsed.data;
      try {
        const report = apiKey
          ? buildReport(await generateClaudeFeedback(request, apiKey), request.answers, 'claude')
          : buildReport(generateSampleFeedback(request.style, request.answers), request.answers, 'sample');
        sendJson(res, 200, report);
      } catch (error) {
        const message = error instanceof FeedbackError ? error.message : `Unexpected error: ${String(error)}`;
        sendJson(res, 502, { error: message });
      }
      return;
    }
    next();
  };

  return {
    name: 'pm-coach-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
