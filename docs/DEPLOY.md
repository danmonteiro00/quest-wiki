# Como publicar o site

O caminho recomendado é **Vercel + Neon**: um único projeto, sem servidor que "dorme", e cada `git push` publica uma nova versão.

## Opções gratuitas

| Opção | Site e API | Banco | Prós | Contras |
| --- | --- | --- | --- | --- |
| **Vercel + Neon** (recomendada) | Vercel | Neon | Um só deploy; responde rápido; já configurada neste projeto | Plano Hobby é só para uso pessoal e não comercial |
| Render + Neon | Render | Neon | Servidor Node tradicional, bom para aprender | No plano grátis dorme após 15 minutos parado e leva cerca de 1 minuto para acordar |
| Cloudflare Pages + Render + Neon | Cloudflare (site) e Render (API) | Neon | Site sempre rápido | Dois deploys, e a API continua dormindo |

Os limites mudam com o tempo, então confira antes nas páginas oficiais: [Neon](https://neon.com/pricing) e [Vercel Hobby](https://vercel.com/docs/plans/hobby-plan). Se o fórum passar a ter receita (doações, por exemplo), confira também as regras de uso comercial da Vercel.

O banco ocupa cerca de 54 MB com a PokeAPI inteira, bem abaixo do limite gratuito do Neon (0,5 GB por projeto).

## Passo a passo: Vercel + Neon

Você vai precisar de contas gratuitas no GitHub, no Neon e na Vercel. Dá para criar as duas últimas entrando com o GitHub.

### 1. Enviar o código para o GitHub

Crie um repositório vazio em <https://github.com/new>, chamado `quest-wiki`. Depois, na pasta do projeto:

```bash
git init
git add .
git commit -m "Primeira versão da Pokédex"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/quest-wiki.git
git push -u origin main
```

O `.gitignore` já deixa de fora o `.env`, o `node_modules` e o banco local.

### 2. Criar o banco no Neon

1. Em <https://console.neon.tech>, crie um projeto. Escolha a região mais próxima dos jogadores; São Paulo, se estiver disponível.
2. Clique em **Connect** e copie a *connection string*. Ela começa com `postgresql://`.

Essa string contém a senha do banco. Nunca coloque ela no código nem a envie para o GitHub.

### 3. Importar os dados para o Neon

Crie um arquivo `.env` na raiz do projeto com a string copiada:

```bash
DATABASE_URL=postgresql://usuario:senha@host.neon.tech/neondb?sslmode=require
```

Depois rode:

```bash
npm run db:import
```

A importação cria as tabelas e grava tudo. Pela internet ela deve demorar mais que no banco local. No final aparece `Concluido: 15484 recursos`, ou um número próximo, caso a PokeAPI tenha sido atualizada.

Enquanto esse `.env` existir, o `npm run dev` também usa o Neon. Para voltar ao banco local, comente a linha com `#`.

### 4. Publicar na Vercel

1. Em <https://vercel.com/new>, importe o repositório `quest-wiki`.
2. Em **Environment Variables**, adicione `DATABASE_URL` com a mesma string do Neon e `ADMIN_PASSWORD` com a senha da edição do mapa.
3. Clique em **Deploy**. As configurações de build já estão em `vercel.json`.

### 5. Conferir

Troque `SEU-SITE` pelo endereço que a Vercel criou:

- `https://SEU-SITE.vercel.app/api/health` deve responder `{"status":"ok","pokemon":1351}`
- `https://SEU-SITE.vercel.app/pokedex` deve abrir a Pokédex

## Publicando novas versões

```bash
git add .
git commit -m "Descreva a mudança"
git push
```

A Vercel publica sozinha a cada push na `main`. Se você enviar outro branch, ela cria um endereço de pré-visualização separado.

**Quando mudar os dados** (nova versão da PokeAPI ou mudança em `server/import/`), o push não basta:

1. Rode `npm run db:import` com o `.env` apontando para o Neon. Use `npm run db:import -- --refresh` para baixar a PokeAPI mais nova.
2. Faça um novo deploy, porque as respostas da API ficam em cache por até um dia. Se as páginas continuarem antigas, use **Purge Cache** nas configurações do projeto na Vercel.

## Se algo der errado

| Sintoma | Onde olhar |
| --- | --- |
| A Pokédex mostra "Não foi possível carregar" | Abra `/api/health`. Veja também os logs em **Vercel > Logs** |
| Erro de conexão com o banco | Confira a `DATABASE_URL` na Vercel e faça um novo deploy, porque variáveis novas só valem a partir do próximo deploy |
| `relation "pokedex_entry" does not exist` | A importação do passo 3 não foi feita neste banco |
| Imagens quebradas em todo o site | O Serebii pode ter bloqueado o uso externo das imagens; veja o item abaixo |

## Sobre as imagens do Serebii

O site carrega as imagens direto dos servidores do Serebii. Isso funciona hoje, mas eles podem bloquear ou mudar os endereços a qualquer momento, e as imagens continuam sendo de terceiros. Antes de o site crescer, vale pedir autorização a eles ou planejar imagens próprias.
