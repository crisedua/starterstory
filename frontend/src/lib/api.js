// En dev: vite proxy reenvía /api -> backend local.
// En prod: define VITE_API_URL apuntando al backend desplegado (Railway/Render/Fly).
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function request(path, opts = {}) {
  let r;
  try {
    r = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
  } catch (e) {
    throw new Error(
      `No se pudo conectar al backend en ${BASE}. ` +
      (import.meta.env.VITE_API_URL
        ? 'Verifica que VITE_API_URL apunte al backend correcto.'
        : 'Define VITE_API_URL en las variables de entorno (o levanta el backend local en :4000).')
    );
  }

  // Si Vercel devuelve index.html porque no hay backend, evitamos JSON.parse del HTML.
  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (r.status === 404) throw new Error(`Backend no encontrado (404 en ${BASE}${path}). ¿Está VITE_API_URL bien configurada?`);
    throw new Error(
      `El backend no respondió JSON (recibí ${contentType || 'sin content-type'}). ` +
      'Probablemente VITE_API_URL no está apuntando al backend o el backend está caído.'
    );
  }

  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || 'Error de API');
  }
  return r.json();
}

export const api = {
  health: () => request('/health'),
  stats: () => request('/stats'),

  getSettings: () => request('/settings'),
  saveSettings: (data) => request('/settings', { method: 'POST', body: JSON.stringify(data) }),

  getChannels: () => request('/channels'),
  addChannel: (data) => request('/channels', { method: 'POST', body: JSON.stringify(data) }),

  getVideos: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/videos${q ? '?' + q : ''}`);
  },
  getVideo: (id) => request(`/videos/${id}`),
  analyzeVideo: (id, force = false) =>
    request(`/videos/${id}/analyze${force ? '?force=true' : ''}`, { method: 'POST' }),

  getScraperRun: (id) => request(`/scraper/runs/${id}`),
  getScraperConfig: () => request('/scraper/config'),
  updateScraperConfig: (channelId, data) =>
    request(`/scraper/config/${channelId}`, { method: 'PUT', body: JSON.stringify(data) }),
  runScraper: (channelId) => request(`/scraper/run/${channelId}`, { method: 'POST' }),
  getScraperRuns: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/scraper/runs${q ? '?' + q : ''}`);
  },

  analyzeAll: () => request('/analyze/run', { method: 'POST' }),

  getRpmProfile: () => request('/rpm/profile'),
  saveRpmProfile: (data) => request('/rpm/profile', { method: 'POST', body: JSON.stringify(data) }),
  rpmDepthCheck: (step, answer) =>
    request('/rpm/depth-check', { method: 'POST', body: JSON.stringify({ step, answer }) }),
  processRpmProfile: () => request('/rpm/profile/process', { method: 'POST' }),
  resetRpmProfile: () => request('/rpm/profile/reset', { method: 'POST' }),

  getPainPoints: () => request('/pain-points'),
  getPainPoint: (id) => request(`/pain-points/${id}`),
  createPainPoint: (data) => request('/pain-points', { method: 'POST', body: JSON.stringify(data) }),
  updatePainPoint: (id, data) => request(`/pain-points/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePainPoint: (id) => request(`/pain-points/${id}`, { method: 'DELETE' }),
  extractPainPoints: (replace = false) =>
    request(`/pain-points/extract-from-videos${replace ? '?replace=true' : ''}`, { method: 'POST' }),
  classifyAllVideos: (force = false) =>
    request(`/pain-points/classify/all${force ? '?force=true' : ''}`, { method: 'POST' }),
  reclassifyAllVideos: () =>
    request('/pain-points/classify/reclassify-all', { method: 'POST' }),
  classifyVideo: (videoId, force = false) =>
    request(`/pain-points/classify/video/${videoId}${force ? '?force=true' : ''}`, { method: 'POST' }),
};
