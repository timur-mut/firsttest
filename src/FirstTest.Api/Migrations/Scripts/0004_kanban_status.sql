-- Replace the boolean is_complete flag with a three-state kanban status.
ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo';

-- Map existing completion state onto the new status column.
UPDATE todos SET status = CASE WHEN is_complete THEN 'done' ELSE 'todo' END;

ALTER TABLE todos DROP COLUMN IF EXISTS is_complete;

ALTER TABLE todos ADD CONSTRAINT todos_status_check
    CHECK (status IN ('todo', 'active', 'done'));

-- Make position sequential within each status column.
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY position, id) AS rn
    FROM todos
)
UPDATE todos SET position = ordered.rn
FROM ordered
WHERE todos.id = ordered.id;
