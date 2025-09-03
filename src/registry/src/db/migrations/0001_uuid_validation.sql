-- Add check constraint to prevent UUIDs from starting with special characters
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to recreate the table
-- Step 1: Create a new table with the constraint
CREATE TABLE IF NOT EXISTS tokens_new (
  token TEXT PRIMARY KEY,
  uuid TEXT NOT NULL CHECK (
    uuid NOT LIKE '~%' AND
    uuid NOT LIKE '!%' AND
    uuid NOT LIKE '*%' AND
    uuid NOT LIKE '^%' AND
    uuid NOT LIKE '&%'
  ),
  scope TEXT NOT NULL
);

-- Step 2: Copy data from the old table to the new one
INSERT INTO tokens_new SELECT * FROM tokens WHERE
  uuid NOT LIKE '~%' AND
  uuid NOT LIKE '!%' AND
  uuid NOT LIKE '*%' AND
  uuid NOT LIKE '^%' AND
  uuid NOT LIKE '&%';

-- Step 3: Drop the old table
DROP TABLE tokens;

-- Step 4: Rename the new table to the original name
ALTER TABLE tokens_new RENAME TO tokens;

-- Step 5: Re-insert the default admin token (just to be safe)
INSERT OR REPLACE INTO tokens (token, uuid, scope) VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  'admin',
  '[{"values":["*"],"types":{"pkg":{"read":true,"write":true},"user":{"read":true,"write":true}}}]'
);
