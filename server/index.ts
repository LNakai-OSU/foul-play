import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { CaseStore } from './store';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 3001);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');

async function main() {
  const store = new CaseStore(dataDir);
  const report = await store.init();
  const app = createApp(store, { staticDir: path.join(root, 'dist') });
  const server = app.listen(port, () => {
    console.log(`API ready on http://localhost:${port}  (data: ${path.relative(root, store.file) || store.file}, ${report.loaded} case${report.loaded === 1 ? '' : 's'} loaded)`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT=<other> (and re-run) or stop the other process.` : err);
    process.exit(1);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
