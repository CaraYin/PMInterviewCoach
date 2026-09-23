import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { apiPlugin } from './server/apiPlugin.ts';

export default defineConfig(({ mode }) => {
  // Read ANTHROPIC_API_KEY from .env.local (or the environment). It's used only by the
  // local server plugin and never exposed to the browser (no VITE_ prefix).
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined;
  return {
    plugins: [react(), apiPlugin(apiKey)],
  };
});
