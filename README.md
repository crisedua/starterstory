# Starter Story LATAM

App que extrae los videos del canal **@starterstory** de YouTube, los clasifica
contra pain points del mercado latinoamericano, los cruza con tu perfil RPM (Tony
Robbins) y propone soluciones validables con MVT.

## Stack

- **Frontend**: React 18 + Vite + React Router + `@supabase/supabase-js`
- **Backend**: Express empaquetado como **Vercel Serverless Function** (`api/[...path].js`)
- **DB**: **Supabase** (Postgres administrado)
- **Scraping**: Apify (`streamers/youtube-scraper`)
- **IA**: Anthropic Claude
- **Scheduling**: **Vercel Cron** (configurado en `vercel.json`)

> Todo se despliega en un solo proyecto de Vercel — frontend, API y cron.
> No necesitas Render ni otro host adicional.

## Setup local

### 1. Crear proyecto en Supabase
1. https://supabase.com → crea un proyecto
2. SQL Editor → New query → pega y ejecuta `supabase/migrations/001_initial_schema.sql`
3. Repite con `supabase/migrations/002_pain_points_seed.sql`
4. Settings → API → copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (¡secreto, nunca al frontend!)

### 2. Variables de entorno

`backend/.env` (solo dev local):
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APIFY_TOKEN=apify_api_...   # opcional aquí, también se puede setear desde la UI
ANTHROPIC_API_KEY=sk-ant-... # idem
```

`frontend/.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instalar y correr
```bash
npm install
npm run dev
```
- Backend en http://localhost:4000
- Frontend en http://localhost:5173

## Despliegue en Vercel (producción)

1. Importa el repo en Vercel.
2. **Framework Preset: Other** (el `vercel.json` ya define todo).
3. **Environment Variables** (Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APIFY_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL` (mismo valor que `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY`
   - *(opcional)* `CRON_SECRET` — si lo defines, el endpoint `/api/cron/scrape` exige `Authorization: Bearer <secret>`
4. Deploy.

Vercel detectará automáticamente:
- `api/[...path].js` y `api/cron/scrape.js` → serverless functions
- `frontend/` → static build (gracias al `buildCommand` del `vercel.json`)
- `crons` en `vercel.json` → ejecuta el scrape diario a las 3 AM UTC

## Roadmap por etapas

- [x] **Etapa 1 — Foundation**: estructura, Supabase + esquema, shell UI, ajustes.
- [x] **Etapa 2 — Scraper**: Apify + scheduling + logs + análisis IA por video.
- [x] **Etapa 3 — Wizard RPM** con depth-check y procesamiento IA.
- [x] **Etapa 4 — Pain Points LATAM + Clasificador IA** dinámico.
- [ ] **Etapa 5 — Motor de Soluciones**.
- [ ] **Etapa 6 — MVT**.

## Decisión de diseño: ¿soporta múltiples canales?

Sí. La tabla `channels` es la raíz; `videos.channel_id` la referencia y
`scraper_config` se configura por canal. Para añadir un segundo canal basta con
`POST /api/channels` + configurar su scheduling — sin migración.

## Decisión de diseño: ¿por qué Express dentro de un serverless?

`api/[...path].js` carga el Express app una sola vez por contenedor (warm) y
delega cada request. Esto permite:
- Reutilizar todas las rutas (`settings`, `channels`, `videos`, `scraper`, `rpm`,
  `pain-points`) sin duplicar lógica.
- Mantener el mismo backend para dev local (`backend/src/server.js`) y producción
  (Vercel) — un solo set de servicios y rutas.
- El cron de Vercel llama a `api/cron/scrape.js` que reusa `runScrape()` de los
  mismos servicios.
