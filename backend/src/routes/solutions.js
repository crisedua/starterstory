import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { generateSolutions } from '../services/solutionGenerator.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('solutions')
      .select('*, pain_points(title, category, severity), solution_video_sources(video_id, inspiration_note, videos(id, title, url, video_analyses(business_name)))')
      .order('fit_score', { ascending: false });
    if (error) throw error;

    const out = (data || []).map((s) => ({
      ...s,
      pain_point_title: s.pain_points?.title,
      pain_point_category: s.pain_points?.category,
      pain_point_severity: s.pain_points?.severity,
      sources: (s.solution_video_sources || []).map((src) => ({
        video_id: src.video_id,
        title: src.videos?.title,
        url: src.videos?.url,
        business_name: src.videos?.video_analyses?.[0]?.business_name,
        inspiration_note: src.inspiration_note,
      })),
    }));

    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('solutions')
      .select('*, pain_points(*), solution_video_sources(video_id, inspiration_note, videos(id, title, url, video_analyses(*)))')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'no encontrado' });

    res.json({
      ...data,
      pain_point: data.pain_points,
      sources: (data.solution_video_sources || []).map((src) => ({
        video_id: src.video_id,
        title: src.videos?.title,
        url: src.videos?.url,
        business_name: src.videos?.video_analyses?.[0]?.business_name,
        analysis_summary: src.videos?.video_analyses?.[0]?.summary,
        inspiration_note: src.inspiration_note,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/generate', async (req, res) => {
  try {
    const replace = req.query.replace !== 'false';
    const r = await generateSolutions({ replaceExisting: replace });
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('solutions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
