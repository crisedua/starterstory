import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { runScrape } from '../services/scraper.js';
import { rescheduleAll } from '../jobs/scheduler.js';

const router = Router();

router.get('/config', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scraper_config')
      .select('*, channels(handle, name)');
    if (error) throw error;
    res.json(
      (data || []).map((c) => ({
        ...c,
        channel_handle: c.channels?.handle,
        channel_name: c.channels?.name,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/config/:channelId', async (req, res) => {
  try {
    const { cron_expression, enabled, max_videos_per_run } = req.body || {};
    const channelId = Number(req.params.channelId);

    const { data: existing } = await supabase
      .from('scraper_config')
      .select('id')
      .eq('channel_id', channelId)
      .maybeSingle();

    const patch = {
      updated_at: new Date().toISOString(),
    };
    if (cron_expression !== undefined) patch.cron_expression = cron_expression;
    if (enabled !== undefined) patch.enabled = !!enabled;
    if (max_videos_per_run !== undefined) patch.max_videos_per_run = max_videos_per_run;

    if (existing) {
      const { error } = await supabase
        .from('scraper_config')
        .update(patch)
        .eq('channel_id', channelId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('scraper_config').insert({
        channel_id: channelId,
        cron_expression: cron_expression || '0 3 * * *',
        enabled: enabled ?? true,
        max_videos_per_run: max_videos_per_run || 10,
      });
      if (error) throw error;
    }

    await rescheduleAll();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/run/:channelId', async (req, res) => {
  const channelId = Number(req.params.channelId);
  runScrape(channelId, 'manual').catch((e) => console.error('scrape error', e));
  res.json({ ok: true, message: 'scraping iniciado' });
});

router.get('/runs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scraper_runs')
      .select('*, channels(handle, name)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'no encontrado' });
    res.json({ ...data, channel_handle: data.channels?.handle, channel_name: data.channels?.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/runs', async (req, res) => {
  try {
    let query = supabase
      .from('scraper_runs')
      .select('*, channels(handle)')
      .order('started_at', { ascending: false })
      .limit(50);
    if (req.query.channel_id) query = query.eq('channel_id', req.query.channel_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json((data || []).map((r) => ({ ...r, channel_handle: r.channels?.handle })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
