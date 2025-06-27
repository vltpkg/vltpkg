CREATE TABLE IF NOT EXISTS packages (
  name TEXT PRIMARY KEY,
  tags TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
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

CREATE TABLE IF NOT EXISTS versions (
  spec TEXT PRIMARY KEY,
  manifest TEXT NOT NULL,
  published_at TEXT NOT NULL
);

-- Insert default admin token
INSERT OR REPLACE INTO tokens (token, uuid, scope) VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  'admin',
  '[{"values":["*"],"types":{"pkg":{"read":true,"write":true},"user":{"read":true,"write":true}}}]'
);
