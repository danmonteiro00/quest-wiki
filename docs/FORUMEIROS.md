# Integração com a Forumeiros

A Forumeiros não oferece uma API pública documentada que eu tenha encontrado, então a integração é feita pelo próprio fórum: links, iframes e os códigos que o painel de administração permite adicionar. **Nada abaixo foi testado em um fórum real ainda.** Os caminhos e seletores podem variar conforme a versão do seu tema.

Troque `SEU-SITE.vercel.app` pelo endereço publicado.

## 1. Link no menu do fórum

É o mais simples: adicione um botão no menu do fórum apontando para `https://SEU-SITE.vercel.app/pokedex`.

## 2. Pokédex dentro de uma página do fórum

O site já tem uma versão sem menu lateral, feita para iframe, em `/embed/pokedex`. Crie uma página HTML no painel e cole:

```html
<iframe
  src="https://SEU-SITE.vercel.app/embed/pokedex"
  title="Pokédex"
  style="width:100%;height:80vh;border:0"
  loading="lazy"
></iframe>
```

Para mostrar um Pokémon específico, use o endereço dele: `/embed/pokedex/pikachu`.

## 3. Ficha do Pokémon dentro das postagens (ideia para depois)

Um código JavaScript do fórum pode trocar uma marcação como `[poke]pikachu[/poke]` por um link ou uma ficha. Ele usaria o painel de códigos JavaScript do fórum e a rota `GET /api/pokemon/pikachu`. Para isso, a API precisaria liberar CORS para o domínio do fórum, o que ainda não está ativado.

## 4. Login com a conta do fórum (ideia para depois)

Códigos JavaScript da Forumeiros conseguem ler o usuário logado pelo objeto `_userdata`. Isso é útil para personalizar a tela, por exemplo mostrando o nome do jogador, mas **não serve como login**: roda no navegador, então qualquer pessoa pode falsificar esse valor antes de enviar ao site.

Uma forma segura de ligar as contas é a verificação por código:

1. O jogador cria a conta na wiki e recebe um código aleatório.
2. Ele coloca esse código no perfil do fórum ou envia a um administrador.
3. O servidor da wiki ou o administrador confere e grava o vínculo.

A tabela `app_user` já tem a coluna `forum_user_id` para guardar esse vínculo.
