// Servidor para desarrollo local. En Vercel se usa api/[...path].js.
import 'dotenv/config';
import { createApp } from './app.js';
import { rescheduleAll } from './jobs/scheduler.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Backend (dev) escuchando en http://localhost:${PORT}`);
  // node-cron solo en local — en Vercel se usa el cron de plataforma.
  if (!process.env.VERCEL) {
    try { await rescheduleAll(); }
    catch (e) { console.error('rescheduleAll error:', e.message); }
  }
});
