import { Router } from 'express';
import { getSetting, setSetting } from '../db/supabase.js';

const router = Router();

const KEYS = ['apify_token', 'anthropic_api_key'];

router.get('/', async (req, res) => {
  try {
    const out = {};
    for (const k of KEYS) {
      const v = await getSetting(k);
      out[k] = v ? '***' + v.slice(-4) : null;
      out[`${k}_set`] = !!v;
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { apify_token, anthropic_api_key } = req.body || {};
    if (apify_token) await setSetting('apify_token', apify_token);
    if (anthropic_api_key) await setSetting('anthropic_api_key', anthropic_api_key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
