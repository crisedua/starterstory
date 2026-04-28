import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { classifyVideo, classifyAll, resetClassifications } from '../services/classifier.js';
import { extractPainPointsFromVideos } from '../services/painPointExtractor.js';

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

// Procesa un batch de videos sin clasificar (o todos si force=true).
// Devuelve { processed, remaining }; el frontend llama repetidamente
// hasta que remaining = 0 — así cada call cabe en los 60s de Vercel.
router.post('/classify/all', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const limit = Number(req.query.limit) || 5;
    const r = await classifyAll({ force, limit });
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Borra todas las clasificaciones (paso previo a una reclasificación masiva).
router.post('/classify/reset', async (req, res) => {
  try {
    await resetClassifications();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Extraer pain points desde los análisis de videos (transcripts procesados)
// + investigar aplicabilidad LATAM con IA
router.post('/extract-from-videos', async (req, res) => {
  try {
    const replace = req.query.replace === 'true';
    const r = await extractPainPointsFromVideos({ replaceExtracted: replace });
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
