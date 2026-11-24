import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const project = dirname(fileURLToPath(import.meta.url));
const scoresFile = resolve(project, 'docs/scores.json');
async function currentScores() { try { return await readFile(scoresFile, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return JSON.stringify({ schemaVersion: 1, updatedAt: null, exams: [] }, null, 2); } }
let scores = '';
export default defineConfig({
  root: resolve(project, 'pages'),
  base: './',
  publicDir: resolve(project, 'public'),
  resolve: { alias: { '@': project } },
  server: { host: '127.0.0.1', fs: { allow: [project] } },
  plugins: [react(), {
    name: 'pages-published-scores',
    async buildStart() { scores = await currentScores(); },
    configureServer(server) { server.middlewares.use(async (request, response, next) => { if (request.url?.split('?')[0] !== '/scores.json') return next(); try { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.end(await currentScores()); } catch { response.statusCode = 500; response.end('无法读取成绩文件'); } }); },
    async closeBundle() { await writeFile(resolve(project, 'docs/.nojekyll'), ''); await writeFile(scoresFile, scores); },
  }],
  build: {
    outDir: resolve(project, 'docs'),
    emptyOutDir: true,
    rolldownOptions: { input: { main: resolve(project, 'pages/index.html'), prepare: resolve(project, 'pages/prepare.html') } },
  },
});
