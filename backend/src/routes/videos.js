import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { analyzeVideo } from '../services/aiAnalyzer.js';

const router = Router();

router.post('/:id/analyze', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    await analyzeVideo(Number(req.params.id), { force });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, channel_id, has_analysis } = req.query;

    let query = supabase
      .from('videos')
      .select(`
        *,
        channels!inner(handle),
        video_analyses(business_name, business_model, industry, monetization, summary),
        video_metric_snapshots(views, likes, captured_at)
      `)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(200);

    if (channel_id) query = query.eq('channel_id', channel_id);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const out = data
      .map((v) => {
        const a = v.video_analyses?.[0];
        const latest = (v.video_metric_snapshots || [])
          .sort((x, y) => new Date(y.captured_at) - new Date(x.captured_at))[0];
        return {
          ...v,
          channel_handle: v.channels?.handle,
          business_name: a?.business_name,
          business_model: a?.business_model,
          industry: a?.industry,
          monetization: a?.monetization,
          summary: a?.summary,
          latest_views: latest?.views,
          latest_likes: latest?.likes,
          has_analysis: !!a,
        };
      })
      .filter((v) => (has_analysis === 'true' ? v.has_analysis : true));

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: v, error } = await supabase
      .from('videos')
      .select('*, channels(handle)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!v) return res.status(404).json({ error: 'no encontrado' });

    const [{ data: analysis }, { data: transcript }, { data: metrics }, { data: classifications }] =
      await Promise.all([
        supabase.from('video_analyses').select('*').eq('video_id', v.id).maybeSingle(),
        supabase.from('video_transcripts').select('*').eq('video_id', v.id).maybeSingle(),
        supabase.from('video_metric_snapshots').select('*').eq('video_id', v.id)
          .order('captured_at', { ascending: false }).limit(30),
        supabase.from('video_pain_point_classifications')
          .select('*, pain_points(title, category)').eq('video_id', v.id),
      ]);

    res.json({
      ...v,
      channel_handle: v.channels?.handle,
      analysis,
      transcript,
      metrics: metrics || [],
      classifications: (classifications || []).map((c) => ({
        ...c,
        title: c.pain_points?.title,
        category: c.pain_points?.category,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
