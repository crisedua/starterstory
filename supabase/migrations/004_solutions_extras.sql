-- =========================================================
-- Campos adicionales del motor de soluciones
-- =========================================================

ALTER TABLE solutions ADD COLUMN IF NOT EXISTS difficulty_reasoning TEXT;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS fit_score_breakdown JSONB;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS first_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS monetization_model TEXT;
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS monthly_revenue_potential_usd INTEGER;
