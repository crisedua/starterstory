-- =========================================================
-- Añade soporte para pain points extraídos desde videos
-- =========================================================

ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS latam_reasoning TEXT;
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS adjustments_for_latam JSONB DEFAULT '[]'::jsonb;

-- Marcar los seed manuales explícitamente
UPDATE pain_points SET source = 'manual' WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS idx_pp_source ON pain_points(source);
