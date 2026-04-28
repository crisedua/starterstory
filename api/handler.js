// Handler único para todas las rutas /api/* (excepto /api/cron/*).
// vercel.json rewrites todo aquí; Express mantiene el routing real.
import { createApp } from '../backend/src/app.js';

let appInstance;
function getApp() {
  if (!appInstance) appInstance = createApp();
  return appInstance;
}

export default function handler(req, res) {
  return getApp()(req, res);
}
