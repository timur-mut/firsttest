CREATE TABLE IF NOT EXISTS todos (
    id          SERIAL PRIMARY KEY,
    title       TEXT        NOT NULL,
    is_complete BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
