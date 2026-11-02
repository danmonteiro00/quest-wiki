# Quest Wiki

Wiki de Pokémon para o fórum de RPG narrativo. React (Vite) no front, Express na API e Postgres no banco.

## Rodando no seu computador

Precisa do Node 22.9 ou mais novo. O banco local já vem embutido (PGlite), não precisa instalar nada.

```bash
npm install
npm run db:import   # baixa a PokeAPI inteira e grava no banco (cerca de 1 minuto)
npm run dev         # abre o site em http://localhost:5173
```

O banco local só aceita um processo por vez: pare o `npm run dev` antes de rodar `npm run db:import`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API (porta 3001) e o site (porta 5173) |
| `npm run build` | Gera o site final em `client/dist` |
| `npm run db:import` | Recarrega os dados no banco. Com `-- --refresh`, baixa a versão mais nova da PokeAPI |
| `npm run images:check` | Lista as formas sem imagem no Serebii |

## Estrutura

```
api/index.js              entrada da API na Vercel
server/app.js             rotas da API
server/db.js              conexão com o banco (Neon ou PGlite)
server/schema.sql         tabelas
server/routes/auth.js     rotas de login reservadas (respondem 501)
server/import/            importação da PokeAPI e regras das imagens do Serebii
client/src/               site em React
```

## API

| Rota | Retorno |
| --- | --- |
| `GET /api/pokemon` | Resumo de todos os Pokémon e formas |
| `GET /api/pokemon/:slug` | Ficha completa (ex.: `rattata-alola`) |
| `GET /api/map/:slug` | Conteúdo de uma área do mapa (ex.: `rota-05`) |
| `GET /api/pokeapi` | Endpoints importados e quantidade de recursos |
| `GET /api/pokeapi/:endpoint/:idOuNome` | Dado original da PokeAPI (ex.: `move/tackle`) |

## Imagens

As imagens vêm direto do Serebii. Quando a forma não tem arte, a página usa o sprite dela e, em último caso, a imagem da forma base. Os sufixos ficam em [server/import/serebii.js](server/import/serebii.js); depois de mudar algum, rode `npm run db:import`.

## Mapa

A seção `/mapa` usa a imagem [client/public/map.jpg](client/public/map.jpg). As posições das cidades, dos quadrados das rotas e das linhas pontilhadas estão em [shared/map-areas.js](shared/map-areas.js), em pixels dessa imagem. Se a imagem mudar, essas posições precisam ser medidas de novo.

O conteúdo de cada área fica no banco, na tabela `map_area`, criada sozinha no primeiro acesso. A importação da PokeAPI não mexe nela.

Para editar, abra `/mapa/admin` e entre com a senha definida em `ADMIN_PASSWORD`. Sem essa variável, a edição fica desligada. As imagens dos locais e dos recursos são endereços externos, então não ocupam espaço no banco nem no projeto.

## Mais guias

- [Como publicar o site](docs/DEPLOY.md)
- [Integração com a Forumeiros](docs/FORUMEIROS.md)
