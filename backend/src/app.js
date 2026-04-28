import express from 'express';
import cors from 'cors';
import { supabase } from './db/supabase.js';
import settingsRouter from './routes/settings.js';
import channelsRouter from './routes/channels.js';
import videosRouter from './routes/videos.js';
import scraperRouter from './routes/scraper.js';
import rpmRouter from './routes/rpm.js';
import painPointsRouter from './routes/painPoints.js';
import { analyzeAllUnanalyzed } from './services/aiAnalyzer.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', async (req, res) => {
    // Detecta problemas de configuración antes de tocar la DB
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const where = process.env.VERCEL ? 'Vercel → Settings → Environment Variables' : 'backend/.env';
      return res.status(500).json({
        ok: false,
        error: `Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en ${where}.`,
        config_missing: true,
      });
    }
    try {
      const { error } = await supabase.from('channels').select('id').limit(1);
      if (error) throw error;
      res.json({ ok: true, ts: Date.now() });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'No se pudo conectar a Supabase: ' + e.message });
    }
  });

  app.use('/api/settings', settingsRouter);
  app.use('/api/channels', channelsRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/scraper', scraperRouter);
  app.use('/api/rpm', rpmRouter);
  app.use('/api/pain-points', painPointsRouter);

  app.post('/api/analyze/run', async (req, res) => {
    try {
      const r = await analyzeAllUnanalyzed();
      res.json({ ok: true, count: r.length, results: r });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const count = async (table, filter) => {
        let q = supabase.from(table).select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count: c } = await q;
        return c || 0;
      };

      const [videos, videos_analyzed, pain_points, classifications, rpm_complete, solutions] =
        await Promise.all([
          count('videos'),
          count('video_analyses'),
          count('pain_points'),
          count('video_pain_point_classifications'),
          count('rpm_profiles', (q) => q.eq('is_complete', true)),
          count('solutions'),
        ]);

      const { data: lastRunArr } = await supabase
        .from('scraper_runs').select('*').order('started_at', { ascending: false }).limit(1);

      res.json({
        videos, videos_analyzed, pain_points, classifications, rpm_complete, solutions,
        last_run: lastRunArr?.[0] || null,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}
