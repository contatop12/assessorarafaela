# Rafaela Alves — Assessora de Investimentos (EQI)

Site de [assessorarafaela.com.br](https://assessorarafaela.com.br) reconstruído em **HTML + CSS + TypeScript**, estático, servido por **Cloudflare Workers** (Static Assets). Substitui o WordPress/Elementor original mantendo as mesmas URLs.

- 112 páginas geradas no build: home, blog (90 artigos, paginação e 3 categorias), Política de Privacidade, Termos de Uso, confirmação do formulário e 404.
- Sem framework e sem dependências em produção: o navegador recebe HTML com CSS embutido, um arquivo JS (~5 KB nas páginas internas, ~16 KB na home) e imagens AVIF.
- Um Worker mínimo cuida só do formulário de contato (`POST /api/lead`).

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm install` | instala as dependências (todas de desenvolvimento) |
| `npm run build` | gera o site em `dist/` |
| `npm run check` | valida o build: links, imagens, `<h1>`, canonical, JSON-LD, FAQ × schema, sitemap |
| `npm run dev` | build + servidor local igual ao da Cloudflare (`http://localhost:8787`) |
| `npm run typecheck` | checagem de tipos (scripts, navegador e Worker) |
| `npm run deploy` | build + `wrangler deploy` (deploy manual, se precisar) |
| `npm run images` | reotimiza as imagens de `assets-src/` → `public/img/` |
| `npm run fonts` | recorta as fontes para o português → `public/fonts/` |

> Depois de um `npm run build` com o `npm run dev` aberto, reinicie o servidor local: o `wrangler dev` nem sempre percebe que `dist/` foi recriada.

## Deploy pelo GitHub (Cloudflare Workers Builds)

O Worker `assessorarafaela` já existe na conta Cloudflare da P12: o primeiro deploy foi manual (`npm run deploy`) e o segredo do formulário já está gravado. Falta só ligar este repositório a ele.

1. No painel da Cloudflare: **Workers & Pages → `assessorarafaela` → Settings → Builds → Connect** e escolha este repositório.
   > Não use *Create → Import a repository*: isso criaria um segundo Worker. O nome do Worker no painel precisa ser igual ao `name` do `wrangler.jsonc` (`assessorarafaela`), senão o build falha.
2. Configure o build:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Branch de produção:** `main`
3. Cada push na `main` publica o site. Com os builds de outras branches ativados, cada branch ganha um Preview (URL `*.workers.dev`, já com `noindex`).
4. **Domínio:** em *Settings → Domains & Routes*, adicione `assessorarafaela.com.br` e `www.assessorarafaela.com.br` como *Custom Domains* (ou descomente o bloco `routes` no `wrangler.jsonc`). A zona precisa estar na mesma conta Cloudflare.
5. **www → domínio raiz:** crie uma *Redirect Rule* (Rules → Redirect Rules): `www.assessorarafaela.com.br/*` → `https://assessorarafaela.com.br/$1`, 301.
6. **Leads do formulário** (ver abaixo): o segredo `LEAD_WEBHOOK_URL` fica guardado na Cloudflare e é mantido a cada deploy. Para trocar o destino, rode `npx wrangler secret put LEAD_WEBHOOK_URL` de novo.
7. Opcional, no painel da zona: ative **Early Hints** (Speed → Optimization) — o site já envia os cabeçalhos `Link` das fontes.

**Em outra conta Cloudflare (sem o Worker criado):** rode `npm run deploy` uma vez, grave o segredo e siga os passos acima.

## Formulário de contato

O formulário da home envia para `POST /api/lead` (Worker em `src/worker/index.ts`), que valida os campos, descarta robôs (campo-isca + tempo mínimo de preenchimento) e encaminha o lead em JSON para o webhook configurado:

```bash
npx wrangler secret put LEAD_WEBHOOK_URL     # n8n, Make, Zapier, CRM…
npx wrangler secret put LEAD_WEBHOOK_TOKEN   # opcional: vai como "Authorization: Bearer …"
```

Payload enviado ao webhook:

```json
{
  "nome": "…", "email": "…", "whatsapp": "+5511…",
  "valor": "Acima de 1 milhão", "objetivo": "Proteção financeira",
  "origem": { "utm_source": "…", "utm_campaign": "…", "gclid": "…" },
  "pagina": "https://assessorarafaela.com.br/", "recebidoEm": "2026-…Z", "pais": "BR", "site": "assessorarafaela.com.br"
}
```

**Sem webhook configurado nenhum lead é perdido:** o site mostra "Falta só um passo" e leva o visitante ao WhatsApp com todos os dados já preenchidos na mensagem. O mesmo acontece se o webhook estiver fora do ar.

O Worker espera até 8 segundos pela resposta do webhook. No n8n, deixe o nó Webhook respondendo imediatamente (*Respond: Immediately*), para um fluxo demorado não cair no aviso do WhatsApp.

> **Este repositório é público.** A URL do webhook fica só no segredo da Cloudflare e no `.dev.vars` local (ignorado pelo Git) — nunca em arquivo versionado.

Para testar localmente, copie `.dev.vars.example` para `.dev.vars`.

## Onde editar

| O quê | Onde |
| --- | --- |
| WhatsApp, GTM, URL do site, redes sociais (`sameAs`), modo de cookies | `src/site.config.ts` |
| Textos da home (seções) | `src/pages/home.html` |
| FAQ, depoimentos, números, cards de serviços/EQI, opções do formulário | `src/content.ts` (alimenta o HTML **e** o schema.org) |
| Artigos do blog | `content/posts/<slug>.html` (cabeçalho JSON em comentário + HTML) |
| Política de Privacidade / Termos de Uso | `content/pages/*.html` |
| Estilos | `src/styles/base.css` (tokens e componentes), `home.css`, `blog.css` |
| Interações | `src/client/shared.ts` (todas as páginas) e `home.ts` |
| Cabeçalho, rodapé, `<head>` | `scripts/templates/layout.ts` |
| Redirecionamentos e cabeçalhos HTTP | final de `scripts/build.ts` (`_redirects` e `_headers`) |

**Novo artigo:** crie `content/posts/meu-slug.html` copiando o cabeçalho de outro post (`slug`, `title`, `description`, `excerpt`, `date`, `modified`, `categories`, `image`). A URL será `/meu-slug/`.

**Nova imagem:** coloque o original em `assets-src/home/`, registre em `HOME` no `scripts/optimize-images.ts`, rode `npm run images` e use no HTML com `<x-img name="…" alt="…" sizes="…">`.

**Imagem de compartilhamento (OG):** `public/og-rafaela-alves.jpg` (1200×630). O layout está em `scripts/og-template.html` — copie para `dist/`, abra no navegador em 1200×630 e capture a tela.

## Estrutura

```text
src/
  site.config.ts      dados de negócio e integrações
  content.ts          conteúdo estruturado da home
  pages/home.html     seções da home
  styles/             base.css, home.css, blog.css
  client/             TypeScript do navegador
  worker/             Cloudflare Worker (API do formulário)
content/              artigos, páginas institucionais, categorias, manifesto de imagens
assets-src/           imagens originais da home
public/               arquivos prontos copiados para dist/ (imagens otimizadas, fontes, ícones)
scripts/              build, checagem, otimização de imagens/fontes, importação do WordPress
wrangler.jsonc        configuração da Cloudflare
```

## Performance

- **Imagens:** AVIF em 2–3 larguras com `srcset`/`sizes`, fallback WebP/JPEG, `width`/`height` (sem layout shift), `lazy` fora da primeira dobra; a foto do hero tem `preload` + `fetchpriority="high"`.
- **Fontes:** Bodoni Moda (variável) e Poppins self-hosted em WOFF2, recortadas para o português (~60 KB no total), com `preload`, `font-display: swap` e fallbacks de métricas ajustadas.
- **CSS/JS:** CSS minificado embutido no HTML (nenhuma requisição bloqueante); JS em módulo com hash e cache imutável de 1 ano.
- **Pré-carregamento:** Speculation Rules (prefetch/prerender ao passar o mouse nos links internos), com prefetch em JS para Safari/Firefox; Early Hints para as fontes.
- **GTM:** carrega na primeira interação ou quando o navegador fica ocioso — não disputa o carregamento da página. Não carrega em `localhost` nem em `*.workers.dev`.
- **Movimento:** todas as animações respeitam `prefers-reduced-motion`.

## SEO, GEO e AEO

- `title`, `description`, canonical, Open Graph e Twitter Card únicos por página; um único `<h1>` por página.
- **Schema.org (JSON-LD):** `WebSite`, `ProfilePage`, `Person` (cargo, empregador, certificações), `Service`, `FAQPage`, `BlogPosting`, `BreadcrumbList`, `CollectionPage`/`ItemList` — sempre espelhando o texto visível.
- **Arquivos gerados no build:** `sitemap.xml` (com imagens), `robots.txt` (buscadores e bots de IA liberados, `/api/` bloqueado), `llms.txt`, `llms-full.txt`, `feed.xml`, `site.webmanifest`.
- **Respostas diretas:** FAQ visível com 8 perguntas, ficha de fatos na seção "Sobre" e sumário nos artigos.
- **Migração sem perda:** todas as URLs do WordPress foram mantidas; `/home/`, `/tag/*`, `/author/*`, feeds e sitemaps antigos redirecionam com 301.
- URLs de teste (`*.workers.dev`) respondem com `X-Robots-Tag: noindex`.

## Rastreamento

O GTM (`GTM-KQ7WPWS6`, o mesmo do site antigo) recebe estes eventos no `dataLayer`:

| Evento | Quando | Parâmetros |
| --- | --- | --- |
| `whatsapp_click` | clique em qualquer link do WhatsApp | `link_location` (hero, cabecalho, flutuante, faq…), `page_path` |
| `form_start` | primeiro foco no formulário | `form_name` |
| `generate_lead` | formulário enviado | `form_name`, `valor_acumulado`, `objetivo`, `lead_forwarded` |
| `form_error` | falha no envio | `form_name` |

Os acionadores do GTM que dependiam do formulário do Elementor precisam apontar para `generate_lead`.

**Cookies:** `consentMode` em `src/site.config.ts` — `opt-out` (padrão, igual ao site antigo: rastreia até o visitante recusar) ou `opt-in` (só rastreia depois do "Aceitar"). O Consent Mode v2 do Google é sinalizado nos dois casos.

## Conteúdo importado do WordPress

`npm run import:wp` (script `scripts/import-wp.ts`) foi usado uma única vez para trazer os artigos e as páginas institucionais pela REST API, limpando o HTML. Depois que o WordPress for desligado ele deixa de funcionar — o conteúdo passa a viver em `content/`.

---

Desenvolvido por [P12 Digital](https://p12digital.com.br/).
