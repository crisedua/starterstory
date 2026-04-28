// Catch-all serverless function que delega al Express app.
// Vercel mapea cualquier /api/* a este archivo.
import { createApp } from '../backend/src/app.js';

let appInstance;
function getApp() {
  if (!appInstance) appInstance = createApp();
  return appInstance;
}

export default function handler(req, res) {
  return getApp()(req, res);
}
