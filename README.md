# Starter Story LATAM

App que extrae los videos del canal **@starterstory** de YouTube, los clasifica
contra pain points del mercado latinoamericano, los cruza con tu perfil RPM (Tony
Robbins) y propone soluciones validables con MVT.

## Stack

- **Frontend**: React 18 + Vite + React Router + `@supabase/supabase-js`
- **Backend**: Node 18+ / Express (orquesta scraping y llamadas a Anthropic)
- **DB**: **Supabase** (Postgres administrado)
- **Scraping**: Apify (`streamers/youtube-scraper`)
- **IA**: Anthropic Claude
- **Scheduling**: node-cron en el backend

## Setup

### 1. Crear proyecto en Supabase
1. Crea un proyecto en https://supabase.com
2. Abre **SQL Editor** → New query
3. Pega el contenido de `supabase/migrations/001_initial_schema.sql` y ejecuta
4. Copia desde Settings → API:
   - `Project URL` → `SUPABASE_URL`
   - `anon public key` → `SUPABASE_ANON_KEY`
   - `service_role secret key` → `SUPABASE_SERVICE_ROLE_KEY` (¡no lo expongas!)

### 2. Configurar variables de entorno

`backend/.env`:
```
PORT=4000
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

`frontend/.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instalar y ejecutar
```bash
npm run install:all
npm run dev
```
- Backend en http://localhost:4000
- Frontend en http://localhost:5173

Abre el frontend → **Ajustes** → carga `APIFY_TOKEN` y `ANTHROPIC_API_KEY` (estos sí
se guardan en Supabase, encriptados a nivel de tabla, accesibles solo desde el backend con service role).

Luego en **Scraper & Logs** define el cron y pulsa "Ejecutar ahora".

## Despliegue

### Frontend (Vercel)
El repo incluye `vercel.json` que apunta a `frontend/`. Pasos:

1. Importa el repo en Vercel.
2. **Framework Preset: Other** (no Vite — el `vercel.json` ya define todo).
3. **Environment variables** (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → URL absoluta del backend desplegado (ej: `https://miapp-backend.onrender.com`)
4. Deploy.

> Si Vercel ya creó el proyecto antes de tener `vercel.json`, puede que tenga "Root Directory" o "Build Command" custom guardados. Ve a Settings → General y déjalos vacíos para que tome los del `vercel.json`.

### Backend (Render / Railway / Fly / VPS)
Vercel no sirve para el backend porque necesita un proceso persistente (`node-cron`). Opciones:

- **Render.com** (gratis, recomendado para esto):
  - New Web Service → conecta el repo
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`, `ANTHROPIC_API_KEY`
- **Railway** o **Fly.io**: similar, ambos detectan Node automáticamente.

Después de desplegar el backend, copia su URL pública en `VITE_API_URL` del frontend en Vercel y redeploya el frontend.

## Roadmap por etapas

- [x] **Etapa 1 — Foundation**: estructura, Supabase + esquema, shell UI, ajustes.
- [ ] **Etapa 2 — Scraper**: Apify + scheduling + logs + análisis IA por video.
- [ ] **Etapa 3 — Wizard RPM**.
- [ ] **Etapa 4 — Pain Points LATAM + Clasificador**.
- [ ] **Etapa 5 — Motor de Soluciones**.
- [ ] **Etapa 6 — MVT**.

## Decisión de diseño: ¿soporta múltiples canales?

Sí. La tabla `channels` es la raíz; `videos.channel_id` la referencia y
`scraper_config` se configura por canal. Para añadir un segundo canal basta con
`POST /api/channels` + configurar su cron — sin migración.

## Decisión de diseño: ¿por qué Express si tenemos Supabase?

Supabase puede ser consumido directo desde el navegador, pero tres operaciones
**no pueden** vivir en el cliente:
1. **Scraping con Apify**: requiere el token de Apify (no exponer al browser).
2. **Llamadas a Anthropic**: requiere la API key (no exponer al browser).
3. **Cron jobs**: necesitan un proceso persistente.

Por eso el backend Express actúa como capa de orquestación y usa el
`service_role` de Supabase para escribir resultados. El frontend lee directo de
Supabase (con `anon key`) cuando se requiere realtime, y consume el backend para
las acciones que disparan trabajo (run scraper, generar soluciones, etc).
