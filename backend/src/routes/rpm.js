import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { depthCheck, processProfile } from '../services/rpmProcessor.js';

const router = Router();

// Devuelve el perfil "default" (la app es de un solo usuario por ahora,
// pero el campo user_label permite escalar a multi-usuario).
router.get('/profile', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rpm_profiles')
      .select('*')
      .eq('user_label', 'default')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json(data || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crea o actualiza el perfil default. No marca is_complete (eso lo hace process).
router.post('/profile', async (req, res) => {
  try {
    const { results_raw, purpose_raw, massive_action_raw } = req.body || {};
    const patch = {
      updated_at: new Date().toISOString(),
    };
    if (results_raw !== undefined) patch.results_raw = results_raw;
    if (purpose_raw !== undefined) patch.purpose_raw = purpose_raw;
    if (massive_action_raw !== undefined) patch.massive_action_raw = massive_action_raw;

    const { data: existing } = await supabase
      .from('rpm_profiles').select('id').eq('user_label', 'default')
      .order('id', { ascending: false }).limit(1).maybeSingle();

    let id;
    if (existing) {
      const { error } = await supabase.from('rpm_profiles').update(patch).eq('id', existing.id);
      if (error) throw error;
      id = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('rpm_profiles')
        .insert({ user_label: 'default', ...patch })
        .select('id').single();
      if (error) throw error;
      id = inserted.id;
    }
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Profundización IA: dado un paso (R, P, M) y la respuesta cruda,
// devuelve feedback y follow-ups si es vaga.
router.post('/depth-check', async (req, res) => {
  try {
    const { step, answer } = req.body || {};
    const result = await depthCheck(step, answer);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Procesa el perfil con IA, extrae estructura y marca is_complete.
router.post('/profile/process', async (req, res) => {
  try {
    const { data: p } = await supabase
      .from('rpm_profiles').select('id, results_raw, purpose_raw, massive_action_raw')
      .eq('user_label', 'default')
      .order('id', { ascending: false }).limit(1).maybeSingle();
    if (!p) return res.status(400).json({ error: 'No hay perfil. Guarda tus respuestas primero.' });

    const missing = [];
    if (!p.results_raw?.trim()) missing.push('Results');
    if (!p.purpose_raw?.trim()) missing.push('Purpose');
    if (!p.massive_action_raw?.trim()) missing.push('Massive Action Plan');
    if (missing.length) return res.status(400).json({ error: `Falta completar: ${missing.join(', ')}` });

    const interpretation = await processProfile(p.id);
    res.json({ ok: true, interpretation });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reinicia el perfil (vuelve a vacío)
router.post('/profile/reset', async (req, res) => {
  try {
    await supabase.from('rpm_profiles').delete().eq('user_label', 'default');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
