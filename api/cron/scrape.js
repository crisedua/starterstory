// Endpoint que Vercel Cron llama según vercel.json.
// Ejecuta el scrape de todos los canales habilitados.
import { supabase } from '../../backend/src/db/supabase.js';
import { runScrape } from '../../backend/src/services/scraper.js';

export default async function handler(req, res) {
  // Verificación opcional con CRON_SECRET (configurar en Vercel env).
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  try {
    const { data: configs } = await supabase
      .from('scraper_config')
      .select('*')
      .eq('enabled', true);

    const results = [];
    for (const c of configs || []) {
      try {
        const r = await runScrape(c.channel_id, 'scheduled');
        results.push({ channel_id: c.channel_id, ok: true, ...r });
      } catch (e) {
        results.push({ channel_id: c.channel_id, ok: false, error: e.message });
      }
    }
    res.json({ ok: true, ran: results.length, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
