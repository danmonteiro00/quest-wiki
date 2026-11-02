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
| `GET /api/images/:id` | Imagem enviada pela Área Administrativa |
| `GET /api/items`, `/api/moves` | Item DEX e Move DEX |
| `GET /api/draws`, `POST /api/draws/:id/roll` | Sorteios; sortear exige login |
| `GET /api/player/profile`, `/api/player/logs` | Área do Jogador |
| `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` | Cadastro e sessão |
| `/api/admin/users`, `/pokedex`, `/map`, `/images`, `/items`, `/moves`, `/draws`, `/logs` | Área Administrativa (Admin e Moderador) |
| `GET /api/pokeapi` | Endpoints importados e quantidade de recursos |
| `GET /api/pokeapi/:endpoint/:idOuNome` | Dado original da PokeAPI (ex.: `move/tackle`) |

## Imagens

As imagens vêm direto do Serebii. Quando a forma não tem arte própria, a página usa a arte da forma base. Os sufixos ficam em [server/import/serebii.js](server/import/serebii.js); depois de mudar algum, rode `npm run db:import`.

## Traduções

As descrições ficam em [server/import/translations/](server/import/translations/), em dicionários de texto em inglês para texto em português. O que não está no dicionário continua em inglês. Nomes de Pokémon, habilidades, golpes, itens e tipos não são traduzidos. Os métodos de evolução são montados em [server/import/evolution-text.js](server/import/evolution-text.js). Depois de mudar um dicionário, rode `npm run db:import`.

## Item DEX, Move DEX e Sorteios

Itens, golpes e as habilidades do formulário da Pokédex ficam na tabela `catalog_entry`. A importação troca só as linhas vindas da PokeAPI; o que foi editado ou excluído na Área Administrativa continua como está. Mudar um golpe na Move DEX muda também a tabela de golpes das fichas.

Cada sorteio é um dado: as faces de todos os resultados precisam somar o número de faces do dado. O servidor decide o resultado e grava em `draw_log` uma cópia dos nomes, então o histórico continua legível depois de excluir o sorteio ou o jogador.

## Mapa

A seção `/mapa` usa a imagem [client/public/map.jpg](client/public/map.jpg). As posições das cidades, dos quadrados das rotas e das linhas pontilhadas estão em [shared/map-areas.js](shared/map-areas.js), em pixels dessa imagem. Se a imagem mudar, essas posições precisam ser medidas de novo.

O conteúdo de cada área fica no banco, na tabela `map_area`, criada sozinha no primeiro acesso. A importação da PokeAPI não mexe nela.

Para editar, entre com uma conta de Admin ou Moderador e abra **Área Administrativa → Mapa**. A imagem pode ser um endereço externo ou um arquivo enviado do computador. Os arquivos enviados são reduzidos no navegador e ficam no banco, na tabela `uploaded_image`.

## Contas e permissões

Navegar pela wiki não exige login. As contas ficam em `app_user`, com senha protegida por scrypt, e as sessões ficam em `app_session`, com um cookie HttpOnly.

| Perfil | Área Administrativa |
| --- | --- |
| Admin | Tudo, inclusive dar e tirar perfis |
| Moderador | Pokédex, Mapa, Item DEX, Move DEX, Sorteios e LOG's; em Usuários, só altera contas de Jogador |
| Game Master | Sem acesso, por enquanto |
| Jogador | Sem acesso |

A primeira conta de Admin é criada ao conectar em um banco que ainda não tem nenhum Admin. Quem cria conta pelo site entra sempre como Jogador.

## Edições na Pokédex

Tudo que a Área Administrativa muda na Pokédex é gravado em `pokedex_entry` e também em `pokedex_override`. O `npm run db:import` recria `pokedex_entry` a partir da PokeAPI e depois reaplica `pokedex_override`, então as edições não se perdem.

## Mais guias

- [Como publicar o site](docs/DEPLOY.md)
- [Integração com a Forumeiros](docs/FORUMEIROS.md)
