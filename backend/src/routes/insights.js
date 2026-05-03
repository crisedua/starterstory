import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// Agregaciones útiles para alimentar el wizard RPM con contexto real.
// Devuelve estrategias y herramientas más usadas por los negocios
// del catálogo, junto con pain points por categoría.
router.get('/actions', async (req, res) => {
  try {
    const [{ data: analyses }, { data: painPoints }] = await Promise.all([
      supabase.from('video_analyses').select('key_strategies, tools_used'),
      supabase.from('pain_points').select('id, title, category, severity').order('severity', { ascending: false }),
    ]);

    const stratFreq = {};
    const toolFreq = {};

    for (const a of analyses || []) {
      const strats = Array.isArray(a.key_strategies) ? a.key_strategies : [];
      const tools = Array.isArray(a.tools_used) ? a.tools_used : [];
      for (const s of strats) {
        const k = String(s).trim().toLowerCase();
        if (!k) continue;
        stratFreq[k] = (stratFreq[k] || 0) + 1;
      }
      for (const t of tools) {
        const k = String(t).trim().toLowerCase();
        if (!k) continue;
        toolFreq[k] = (toolFreq[k] || 0) + 1;
      }
    }

    const top = (freq, n) =>
      Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, count]) => ({ label, count }));

    res.json({
      pain_points: painPoints || [],
      top_strategies: top(stratFreq, 15),
      top_tools: top(toolFreq, 15),
      analyzed_count: (analyses || []).length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
