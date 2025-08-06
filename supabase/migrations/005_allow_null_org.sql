-- Allow canvases to be created without an organization_id temporarily
ALTER TABLE canvases ALTER COLUMN organization_id DROP NOT NULL;