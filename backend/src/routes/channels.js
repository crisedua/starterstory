import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .order('added_at', { ascending: true });
    if (error) throw error;

    // contar videos por canal
    const out = [];
    for (const c of channels) {
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', c.id);
      out.push({ ...c, video_count: count || 0 });
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { handle, name, url } = req.body || {};
    if (!handle) return res.status(400).json({ error: 'handle requerido' });
    const { data, error } = await supabase
      .from('channels')
      .insert({ handle, name: name || handle, url: url || `https://www.youtube.com/${handle}` })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
