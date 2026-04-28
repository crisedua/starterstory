const BASE = '/api';

async function request(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
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
};
