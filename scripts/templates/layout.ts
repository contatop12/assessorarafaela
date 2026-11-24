/** Casca do documento: <head> (SEO, preloads, schema), cabeçalho, rodapé e elementos fixos. */
import { site, whatsappUrl } from '../../src/site.config.ts';
import { abs, esc, jsonLd, picture, type Icons } from '../lib/html.ts';

export interface PageMeta {
  /** Caminho canônico, com barra final: `/`, `/blog/`, `/meu-post/`. */
  path: string;
  title: string;
  description: string;
  css: string;
  script: string;
  graph: object[];
  ogType?: 'website' | 'article';
  ogImage?: { url: string; width: number; height: number; alt: string };
  article?: { published: string; modified: string; section?: string };
  /** <link>s extras de preload (imagem de LCP, por exemplo). */
  preloads?: string[];
  robots?: string;
  prev?: string;
  next?: string;
  bodyClass?: string;
}

export interface Shell {
  icons: Icons;
  year: number;
  categories: Array<{ slug: string; name: string }>;
}

/** Navegação curta do cabeçalho (as âncoras são as mesmas do site original). */
const NAV = [
  { href: '/#assessoria', label: 'Como funciona' },
  { href: '/#sobre', label: 'Sobre' },
  { href: '/#avaliacao', label: 'Depoimentos' },
  { href: '/#faq', label: 'Dúvidas' },
  { href: '/blog/', label: 'Blog' },
];

/** O rodapé lista todas as seções. */
const FOOTER_NAV = [
  { href: '/#assessoria', label: 'Como funciona' },
  { href: '/#sobre', label: 'Sobre a Rafaela' },
  { href: '/#eqi', label: 'Vínculo com a EQI' },
  { href: '/#avaliacao', label: 'Depoimentos' },
  { href: '/#faq', label: 'Perguntas frequentes' },
  { href: '/#contato', label: 'Contato' },
  { href: '/blog/', label: 'Blog' },
];

const DEFAULT_OG = { url: '/og-rafaela-alves.jpg', width: 1200, height: 630, alt: 'Rafaela Alves, assessora de investimentos vinculada à EQI' };

const SPECULATION = JSON.stringify({
  prefetch: [{ where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/api/*' } }] }, eagerness: 'moderate' }],
  prerender: [
    {
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/api/*' } }, { not: { selector_matches: '[target=_blank]' } }] },
      eagerness: 'moderate',
    },
  ],
});

function head(meta: PageMeta): string {
  const canonical = abs(meta.path);
  const og = meta.ogImage ?? DEFAULT_OG;
  const robots = meta.robots ?? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta name="robots" content="${robots}">`,
    meta.prev ? `<link rel="prev" href="${abs(meta.prev)}">` : '',
    meta.next ? `<link rel="next" href="${abs(meta.next)}">` : '',
    // Marca "tem JS" antes do primeiro paint: só então as animações de entrada escondem conteúdo.
    "<script>document.documentElement.classList.add('js')</script>",
    '<link rel="preload" href="/fonts/playfair-display.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin>',
    ...(meta.preloads ?? []),
    `<link rel="modulepreload" href="${meta.script}">`,
    `<style>${meta.css}</style>`,
    `<script type="module" src="${meta.script}"></script>`,
    `<meta name="theme-color" content="${site.themeColor}">`,
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<link rel="alternate" type="application/rss+xml" title="${esc(site.shortName)} — Blog" href="/feed.xml">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:type" content="${meta.ogType ?? 'website'}">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${abs(og.url)}">`,
    `<meta property="og:image:width" content="${og.width}">`,
    `<meta property="og:image:height" content="${og.height}">`,
    `<meta property="og:image:alt" content="${esc(og.alt)}">`,
    meta.article ? `<meta property="article:published_time" content="${meta.article.published}">` : '',
    meta.article ? `<meta property="article:modified_time" content="${meta.article.modified}">` : '',
    meta.article?.section ? `<meta property="article:section" content="${esc(meta.article.section)}">` : '',
    meta.article ? `<meta property="article:author" content="${esc(site.person.name)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${abs(og.url)}">`,
    `<meta name="author" content="${esc(site.person.name)}">`,
    `<script type="speculationrules">${SPECULATION}</script>`,
    jsonLd(meta.graph),
  ];
  return lines.filter(Boolean).join('\n');
}

const LOGO = 'logo-rafaela-alves-assessora-de-investimento-eqi';

function header(icons: Icons): string {
  const links = NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('');
  return `
<header class="header" data-header>
  <div class="header__inner container">
    <a class="header__logo" href="/" aria-label="${esc(site.name)} — página inicial">
      ${picture(LOGO, { alt: 'Rafaela Alves — Assessora de Investimento EQI', sizes: '(min-width: 62em) 190px, 160px', eager: true, normalPriority: true, maxWidth: 560 })}
    </a>
    <nav class="nav" aria-label="Principal" id="menu" data-nav>
      <ul class="nav__list">${links}</ul>
      <a class="btn btn--gold nav__cta" href="${esc(whatsappUrl())}" target="_blank" rel="noopener noreferrer" data-wa="menu">
        ${icons.use('whatsapp')}<span>Falar no WhatsApp</span>
      </a>
    </nav>
    <a class="btn btn--outline header__cta" href="${esc(whatsappUrl())}" target="_blank" rel="noopener noreferrer" data-wa="cabecalho">
      ${icons.use('whatsapp')}<span>Falar no WhatsApp</span>
    </a>
    <button class="header__toggle" type="button" aria-expanded="false" aria-controls="menu" data-nav-toggle>
      <span class="sr-only">Abrir menu</span>
      <span class="header__bars" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>
  </div>
</header>`;
}

function footer(shell: Shell): string {
  const { icons } = shell;
  const nav = FOOTER_NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('');
  const cats = shell.categories.map((c) => `<li><a href="/category/${c.slug}/">${esc(c.name)}</a></li>`).join('');
  return `
<footer class="footer theme-deep">
  <div class="container footer__grid">
    <div class="footer__brand">
      <a href="/" class="footer__logo" aria-label="${esc(site.name)} — página inicial">
        ${picture(LOGO, { alt: 'Rafaela Alves — Assessora de Investimento EQI', sizes: '(min-width: 48em) 340px, 260px' })}
      </a>
      <p>Assessora de investimentos vinculada à EQI Investimentos. Atendimento a pessoa física e empresas em todo o Brasil.</p>
      <a class="btn btn--outline" href="${site.openAccountUrl}" target="_blank" rel="noopener noreferrer">Abrir conta na EQI ${icons.use('arrow-up-right')}</a>
    </div>
    <nav class="footer__col" aria-label="Rodapé — navegação">
      <h2 class="footer__title">Navegação</h2>
      <ul>${nav}</ul>
    </nav>
    <nav class="footer__col" aria-label="Rodapé — blog">
      <h2 class="footer__title">Blog</h2>
      <ul><li><a href="/blog/">Todos os artigos</a></li>${cats}</ul>
    </nav>
    <div class="footer__col">
      <h2 class="footer__title">Contato</h2>
      <ul>
        <li><a href="${esc(whatsappUrl())}" target="_blank" rel="noopener noreferrer" data-wa="rodape">WhatsApp ${site.whatsapp.display}</a></li>
        <li><a href="/#contato">Formulário de contato</a></li>
        <li><a href="/politica-de-privacidade/">Política de Privacidade</a></li>
        <li><a href="/termos-de-uso-assessora-rafaela-alves/">Termos de Uso</a></li>
        <li><button type="button" class="linklike" data-cookie-open>Preferências de cookies</button></li>
      </ul>
    </div>
  </div>
  <div class="container footer__legal">
    <p class="footer__disclaimer">As informações deste site têm caráter exclusivamente informativo e não constituem oferta, recomendação ou garantia de rentabilidade. Investimentos envolvem riscos e podem resultar em perdas. Rentabilidade passada não representa garantia de rentabilidade futura.</p>
    <p class="footer__copy">Copyright © ${shell.year} Rafaela Alves Assessora — Todos os direitos reservados <span aria-hidden="true">|</span> <a href="${site.developer.url}" target="_blank" rel="noopener">Desenvolvido por ${site.developer.name}</a></p>
  </div>
</footer>`;
}

function fixtures(icons: Icons): string {
  return `
<a class="sticky-cta" href="${esc(whatsappUrl())}" target="_blank" rel="noopener noreferrer" aria-label="Falar com a Rafaela no WhatsApp" data-wa="flutuante" data-sticky-cta>
  ${icons.use('whatsapp')}<span>Falar com a Rafaela</span>
</a>
<div class="cookie" role="dialog" aria-live="polite" aria-label="Aviso de cookies" hidden data-cookie>
  <p>Utilizo cookies para melhorar a sua experiência e medir o desempenho do site. Saiba mais na <a href="/politica-de-privacidade/">Política de Privacidade</a>.</p>
  <div class="cookie__actions">
    <button type="button" class="btn btn--gold btn--sm" data-cookie-accept>Aceitar</button>
    <button type="button" class="btn btn--outline btn--sm" data-cookie-deny>Recusar</button>
  </div>
</div>`;
}

/** Monta o documento final. `main` já vem com os ícones registrados em `shell.icons`. */
export function layout(meta: PageMeta, main: string, shell: Shell): string {
  const top = header(shell.icons);
  const bottom = footer(shell) + fixtures(shell.icons);
  return `<!doctype html>
<html lang="${site.locale}" data-gtm="${site.gtmId}" data-consent="${site.consentMode}">
<head>
${head(meta)}
</head>
<body${meta.bodyClass ? ` class="${meta.bodyClass}"` : ''}>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<!--sprite-->
<div class="progress" aria-hidden="true"><i data-progress></i></div>
${top}
<main id="conteudo">
${main}
</main>
${bottom}
</body>
</html>`.replace('<!--sprite-->', () => shell.icons.sprite());
}
