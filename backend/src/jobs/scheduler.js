import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { runScrape } from '../services/scraper.js';

const tasks = new Map();

export async function rescheduleAll() {
  const { data: configs, error } = await supabase.from('scraper_config').select('*');
  if (error) {
    console.error('[cron] error leyendo config:', error.message);
    return;
  }

  for (const [id, t] of tasks) t.stop();
  tasks.clear();

  for (const c of configs || []) {
    if (!c.enabled) continue;
    if (!cron.validate(c.cron_expression)) {
      console.warn(`[cron] cron inválido para canal ${c.channel_id}: ${c.cron_expression}`);
      continue;
    }
    const task = cron.schedule(c.cron_expression, async () => {
      try {
        console.log(`[cron] iniciando scraping canal ${c.channel_id}`);
        await runScrape(c.channel_id, 'scheduled');
      } catch (e) {
        console.error('[cron] error scraping:', e.message);
      }
    });
    tasks.set(c.channel_id, task);
    console.log(`[cron] canal ${c.channel_id} programado: ${c.cron_expression}`);
  }
}
