import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { classifyVideo, classifyAll, reclassifyAll } from '../services/classifier.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pain_points')
      .select('*')
      .order('severity', { ascending: false })
      .order('id', { ascending: true });
    if (error) throw error;

    // Conteo de clasificaciones por pain point
    const out = [];
    for (const p of data || []) {
      const { count } = await supabase
        .from('video_pain_point_classifications')
        .select('*', { count: 'exact', head: true })
        .eq('pain_point_id', p.id);
      out.push({ ...p, video_match_count: count || 0 });
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pain_points').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'no encontrado' });

    const { data: matches } = await supabase
      .from('video_pain_point_classifications')
      .select('*, videos(id, title, url, video_analyses(business_name, industry))')
      .eq('pain_point_id', req.params.id)
      .order('relevance_score', { ascending: false });

    res.json({
      ...data,
      matches: (matches || []).map((m) => ({
        ...m,
        video_title: m.videos?.title,
        video_url: m.videos?.url,
        business_name: m.videos?.video_analyses?.[0]?.business_name,
        industry: m.videos?.video_analyses?.[0]?.industry,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, category, description, severity, evidence } = req.body || {};
    if (!title || !category) return res.status(400).json({ error: 'title y category requeridos' });
    const { data, error } = await supabase
      .from('pain_points')
      .insert({ title, category, description, severity: severity ?? 5, evidence: evidence || [] })
      .select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, category, description, severity, evidence } = req.body || {};
    const patch = { updated_at: new Date().toISOString() };
    if (title !== undefined) patch.title = title;
    if (category !== undefined) patch.category = category;
    if (description !== undefined) patch.description = description;
    if (severity !== undefined) patch.severity = severity;
    if (evidence !== undefined) patch.evidence = evidence;
    const { error } = await supabase.from('pain_points').update(patch).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('pain_points').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// Clasificación
// =========================================================

router.post('/classify/video/:videoId', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const r = await classifyVideo(Number(req.params.videoId), { force });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/classify/all', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    // Background-ish: respondemos rápido y dejamos correr.
    classifyAll({ force }).catch((e) => console.error('classifyAll', e.message));
    res.json({ ok: true, message: 'clasificación iniciada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reclasificación masiva (llamar al cambiar pain points)
router.post('/classify/reclassify-all', async (req, res) => {
  try {
    reclassifyAll().catch((e) => console.error('reclassifyAll', e.message));
    res.json({ ok: true, message: 'reclasificación iniciada — borrando previas y reanalizando' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
