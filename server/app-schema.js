// Tabelas da propria wiki, criadas ao conectar para nao depender de rodar a importacao da PokeAPI.
// Nenhuma delas e apagada por db:import, que so limpa as tabelas de schema.sql.
export const APP_SCHEMA = `
CREATE TABLE IF NOT EXISTS app_user (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL UNIQUE,
  email text UNIQUE,
  password_hash text,
  forum_user_id integer UNIQUE,
  role text NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS failed_logins integer NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS locked_until timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS app_user_username_lower_idx ON app_user (lower(username));

CREATE TABLE IF NOT EXISTS app_session (
  token_hash text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_session_user_idx ON app_session (user_id);

CREATE TABLE IF NOT EXISTS map_area (
  slug text PRIMARY KEY,
  content json NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tudo que a Area Administrativa muda na Pokedex. db:import recria pokedex_entry e reaplica esta tabela.
CREATE TABLE IF NOT EXISTS pokedex_override (
  slug text PRIMARY KEY,
  deleted boolean NOT NULL DEFAULT false,
  id integer,
  dex_number integer,
  summary json,
  detail json,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploaded_image (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_type text NOT NULL,
  data bytea NOT NULL,
  uploaded_by bigint REFERENCES app_user (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Primeira conta de Admin. So o hash da senha fica no codigo, e so entra se nao houver nenhum Admin.
INSERT INTO app_user (username, email, password_hash, role)
SELECT 'admin', 'admin@questwiki.local', 'scrypt$65536$8$1$+WiRudHDWNoN4MkjEWbciw==$H7781z069vdDYKojr/BUc1uTmsLUKPBgnutATdkDmKk=', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE role = 'admin')
ON CONFLICT DO NOTHING;
`;
