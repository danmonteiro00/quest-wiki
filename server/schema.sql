-- Copia integral da PokeAPI: um documento JSON por recurso de cada endpoint.
CREATE TABLE IF NOT EXISTS pokeapi_resource (
  endpoint text NOT NULL,
  id integer NOT NULL,
  name text,
  data json NOT NULL,
  PRIMARY KEY (endpoint, id)
);
CREATE INDEX IF NOT EXISTS pokeapi_resource_name_idx ON pokeapi_resource (endpoint, name);

-- Dados ja montados para a Pokedex, para servir cada pagina com uma unica leitura.
CREATE TABLE IF NOT EXISTS pokedex_entry (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  dex_number integer NOT NULL,
  summary json NOT NULL,
  detail json NOT NULL
);
CREATE INDEX IF NOT EXISTS pokedex_entry_order_idx ON pokedex_entry (dex_number, id);
