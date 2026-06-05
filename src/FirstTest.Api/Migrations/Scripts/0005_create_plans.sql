CREATE TABLE IF NOT EXISTS plans (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    scene      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plans_updated_at_idx ON plans (updated_at DESC);
