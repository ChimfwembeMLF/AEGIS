import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const input: Record<string, string> = { main: resolve('index.html') };
  if (mode === 'e2e') input.harness = resolve('tests/e2e/harness.html');
  return { build: { rollupOptions: { input } } };
});
