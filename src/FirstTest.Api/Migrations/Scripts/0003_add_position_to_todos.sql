ALTER TABLE todos ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with a stable order based on id.
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM todos
)
UPDATE todos
SET position = ordered.rn
FROM ordered
WHERE todos.id = ordered.id;
