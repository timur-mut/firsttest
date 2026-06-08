-- Reference-image underlay for a plan: the original floor-plan image (client
-- JSON: dataURL + transform), shown behind the geometry for manual tracing.
-- Stored as a sibling of `scene`; nullable (most plans have none).
ALTER TABLE plans ADD COLUMN IF NOT EXISTS reference_image JSONB;
