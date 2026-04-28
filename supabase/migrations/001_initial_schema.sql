-- =========================================================
-- Esquema Postgres / Supabase
-- Ejecutar en Supabase Studio → SQL Editor → New query → Run
-- =========================================================

CREATE TABLE IF NOT EXISTS channels (
  id BIGSERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  name TEXT,
  url TEXT,
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  youtube_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  first_scraped_at TIMESTAMPTZ DEFAULT now(),
  last_scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots de datos que cambian con el tiempo
CREATE TABLE IF NOT EXISTS video_metric_snapshots (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- Transcripciones (1:1 con video)
CREATE TABLE IF NOT EXISTS video_transcripts (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT UNIQUE NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language TEXT,
  transcript TEXT,
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Datos derivados por IA (separados del raw)
CREATE TABLE IF NOT EXISTS video_analyses (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT UNIQUE NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  business_name TEXT,
  founder_name TEXT,
  business_model TEXT,
  industry TEXT,
  monetization TEXT,
  revenue_estimate TEXT,
  origin_story TEXT,
  key_strategies JSONB,
  tools_used JSONB,
  summary TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Pain Points LATAM
CREATE TABLE IF NOT EXISTS pain_points (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  evidence JSONB,
  severity INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_pain_point_classifications (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  pain_point_id BIGINT NOT NULL REFERENCES pain_points(id) ON DELETE CASCADE,
  relevance_score REAL,
  reasoning TEXT,
  classified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, pain_point_id)
);

-- Perfil RPM
CREATE TABLE IF NOT EXISTS rpm_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_label TEXT DEFAULT 'default',
  results_raw TEXT,
  purpose_raw TEXT,
  massive_action_raw TEXT,
  ai_interpretation JSONB,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Soluciones generadas
CREATE TABLE IF NOT EXISTS solutions (
  id BIGSERIAL PRIMARY KEY,
  rpm_profile_id BIGINT NOT NULL REFERENCES rpm_profiles(id) ON DELETE CASCADE,
  pain_point_id BIGINT REFERENCES pain_points(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  latam_adaptation TEXT,
  rpm_alignment TEXT,
  difficulty TEXT,
  fit_score INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solution_video_sources (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  inspiration_note TEXT
);

-- Validación MVT
CREATE TABLE IF NOT EXISTS mvt_validations (
  id BIGSERIAL PRIMARY KEY,
  solution_id BIGINT NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mvt_immersion_interviews (
  id BIGSERIAL PRIMARY KEY,
  validation_id BIGINT NOT NULL REFERENCES mvt_validations(id) ON DELETE CASCADE,
  person_label TEXT,
  channel TEXT,
  current_solution TEXT,
  pain_level INTEGER,
  would_pay TEXT,
  evidence_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mvt_hypotheses (
  id BIGSERIAL PRIMARY KEY,
  validation_id BIGINT NOT NULL REFERENCES mvt_validations(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  risk INTEGER,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mvt_tests (
  id BIGSERIAL PRIMARY KEY,
  hypothesis_id BIGINT NOT NULL REFERENCES mvt_hypotheses(id) ON DELETE CASCADE,
  test_type TEXT,
  description TEXT,
  evidence_url TEXT,
  result TEXT,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scraper config y logs
CREATE TABLE IF NOT EXISTS scraper_config (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT UNIQUE NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  max_videos_per_run INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scraper_runs (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT,
  videos_found INTEGER DEFAULT 0,
  videos_new INTEGER DEFAULT 0,
  videos_updated INTEGER DEFAULT 0,
  error_message TEXT,
  trigger TEXT
);

-- Configuración de la app (API keys, settings)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_video ON video_metric_snapshots(video_id);
CREATE INDEX IF NOT EXISTS idx_classifications_video ON video_pain_point_classifications(video_id);
CREATE INDEX IF NOT EXISTS idx_classifications_pp ON video_pain_point_classifications(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_solutions_profile ON solutions(rpm_profile_id);
CREATE INDEX IF NOT EXISTS idx_runs_channel ON scraper_runs(channel_id, started_at DESC);

-- Seed: canal por defecto + config
INSERT INTO channels (handle, name, url) VALUES
  ('@starterstory', 'Starter Story', 'https://www.youtube.com/@starterstory')
ON CONFLICT (handle) DO NOTHING;

INSERT INTO scraper_config (channel_id, cron_expression, enabled, max_videos_per_run)
SELECT id, '0 3 * * *', true, 30 FROM channels WHERE handle = '@starterstory'
ON CONFLICT (channel_id) DO NOTHING;

-- =========================================================
-- Row Level Security
-- Para esta app de un solo usuario, dejamos lectura pública.
-- Las escrituras desde el frontend van a través del backend (service role),
-- así que activamos RLS pero solo damos SELECT al rol anon.
-- =========================================================

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_pain_point_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvt_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvt_immersion_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvt_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'channels','videos','video_metric_snapshots','video_transcripts','video_analyses',
      'pain_points','video_pain_point_classifications','rpm_profiles','solutions',
      'solution_video_sources','mvt_validations','mvt_immersion_interviews',
      'mvt_hypotheses','mvt_tests','scraper_config','scraper_runs'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS read_all ON %I', t);
    EXECUTE format('CREATE POLICY read_all ON %I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- app_settings NO se expone al anon (contiene API keys)
-- (no SELECT policy → anon no puede leerla)
