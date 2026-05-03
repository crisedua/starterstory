import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// =========================================================
// Validaciones (1 por solución que se está validando)
// =========================================================

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mvt_validations')
      .select('*, solutions(id, title, fit_score, difficulty)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // contar interviews/hypotheses/tests por validation
    const out = [];
    for (const v of data || []) {
      const [{ count: interviews }, { count: hypotheses }, { data: hypIds }] = await Promise.all([
        supabase.from('mvt_immersion_interviews').select('*', { count: 'exact', head: true }).eq('validation_id', v.id),
        supabase.from('mvt_hypotheses').select('*', { count: 'exact', head: true }).eq('validation_id', v.id),
        supabase.from('mvt_hypotheses').select('id').eq('validation_id', v.id),
      ]);
      let tests = 0;
      if (hypIds?.length) {
        const ids = hypIds.map((h) => h.id);
        const { count } = await supabase.from('mvt_tests').select('*', { count: 'exact', head: true }).in('hypothesis_id', ids);
        tests = count || 0;
      }
      out.push({
        ...v,
        solution_title: v.solutions?.title,
        solution_fit_score: v.solutions?.fit_score,
        counts: { interviews: interviews || 0, hypotheses: hypotheses || 0, tests },
      });
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: v, error } = await supabase
      .from('mvt_validations')
      .select('*, solutions(*)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!v) return res.status(404).json({ error: 'no encontrado' });

    const [interviews, hypotheses] = await Promise.all([
      supabase.from('mvt_immersion_interviews').select('*').eq('validation_id', v.id).order('id', { ascending: true }),
      supabase.from('mvt_hypotheses').select('*').eq('validation_id', v.id).order('risk', { ascending: false }),
    ]);

    const hypIds = (hypotheses.data || []).map((h) => h.id);
    let tests = [];
    if (hypIds.length) {
      const { data } = await supabase.from('mvt_tests').select('*').in('hypothesis_id', hypIds).order('id', { ascending: true });
      tests = data || [];
    }

    res.json({
      ...v,
      solution: v.solutions,
      interviews: interviews.data || [],
      hypotheses: hypotheses.data || [],
      tests,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { solution_id } = req.body || {};
    if (!solution_id) return res.status(400).json({ error: 'solution_id requerido' });
    const { data, error } = await supabase
      .from('mvt_validations')
      .insert({ solution_id, status: 'in_progress' })
      .select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    const { error } = await supabase
      .from('mvt_validations')
      .update({ status })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('mvt_validations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// PASO 1: Inmersión (entrevistas)
// =========================================================

router.post('/:id/interviews', async (req, res) => {
  try {
    const { person_label, channel, current_solution, pain_level, would_pay, evidence_url, notes } = req.body || {};
    const { data, error } = await supabase.from('mvt_immersion_interviews').insert({
      validation_id: req.params.id,
      person_label, channel, current_solution, pain_level, would_pay, evidence_url, notes,
    }).select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/interviews/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('mvt_immersion_interviews').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// PASO 2: Hipótesis
// =========================================================

router.post('/:id/hypotheses', async (req, res) => {
  try {
    const { statement, risk, is_critical } = req.body || {};
    const { data, error } = await supabase.from('mvt_hypotheses').insert({
      validation_id: req.params.id,
      statement, risk, is_critical: !!is_critical,
    }).select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/hypotheses/:id', async (req, res) => {
  try {
    const { statement, risk, is_critical } = req.body || {};
    const patch = {};
    if (statement !== undefined) patch.statement = statement;
    if (risk !== undefined) patch.risk = risk;
    if (is_critical !== undefined) patch.is_critical = !!is_critical;
    const { error } = await supabase.from('mvt_hypotheses').update(patch).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/hypotheses/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('mvt_hypotheses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// PASO 3-5: Tests sobre hipótesis críticas (con evidencia)
// =========================================================

router.post('/hypotheses/:hypId/tests', async (req, res) => {
  try {
    const { test_type, description, evidence_url, result, metrics } = req.body || {};
    const { data, error } = await supabase.from('mvt_tests').insert({
      hypothesis_id: req.params.hypId,
      test_type, description, evidence_url, result, metrics: metrics || null,
    }).select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tests/:id', async (req, res) => {
  try {
    const patch = req.body || {};
    const { error } = await supabase.from('mvt_tests').update(patch).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/tests/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('mvt_tests').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
