/** Templates do blog, das páginas institucionais e do 404. */
import { site, whatsappUrl } from '../../src/site.config.ts';
import { esc, formatDate, picture, type Icons } from '../lib/html.ts';

export interface Category {
  slug: string;
  name: string;
  description: string;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  date: string;
  modified: string;
  categories: string[];
  image: string;
  /** HTML final do corpo (imagens já expandidas em <picture>). */
  html: string;
  toc: Array<{ id: string; text: string }>;
  words: number;
  minutes: number;
}

export interface LegalPage {
  slug: string;
  title: string;
  modified: string;
  html: string;
}

const crumbs = (items: Array<{ href?: string; label: string }>): string =>
  `<nav class="crumbs" aria-label="Você está em"><ol>${items
    .map((c) => (c.href ? `<li><a href="${c.href}">${esc(c.label)}</a></li>` : `<li aria-current="page">${esc(c.label)}</li>`))
    .join('')}</ol></nav>`;

export interface PostCardOptions {
  eager?: boolean;
  heading?: 'h2' | 'h3';
  /** Tema exibido no lugar da categoria (home: a categoria importada nem sempre corresponde ao artigo). */
  topic?: string;
  /** Chamada exibida no lugar do resumo do artigo (home: chamadas revisadas). */
  excerpt?: string;
}

export function postCard(post: Post, cats: Map<string, Category>, opts: PostCardOptions = {}): string {
  const h = opts.heading ?? 'h2';
  const label = opts.topic ?? cats.get(post.categories[0] ?? '')?.name;
  const img = picture(post.image, {
    alt: '',
    sizes: '(min-width: 62em) 370px, (min-width: 40em) 46vw, 92vw',
    maxWidth: 800,
    eager: opts.eager,
  });
  return `<article class="card">
  <a class="card__media" href="/${post.slug}/" tabindex="-1" aria-hidden="true">${img}</a>
  <div class="card__body">
    ${label ? `<p class="card__cat">${esc(label)}</p>` : ''}
    <${h} class="card__title"><a href="/${post.slug}/">${esc(post.title)}</a></${h}>
    <p class="card__text">${esc(opts.excerpt ?? post.excerpt)}</p>
    <p class="card__meta"><time datetime="${post.date}">${formatDate(post.date)}</time><span>${post.minutes} min de leitura</span></p>
  </div>
</article>`;
}

export interface ListingOptions {
  heading: string;
  intro: string;
  posts: Post[];
  page: number;
  pages: number;
  /** `/blog/` ou `/category/slug/`. */
  basePath: string;
  categories: Category[];
  currentCategory?: string;
  cats: Map<string, Category>;
  icons: Icons;
}

export const pageUrl = (basePath: string, page: number): string => (page <= 1 ? basePath : `${basePath}page/${page}/`);

export function listingPage(o: ListingOptions): string {
  const filters = [
    `<li><a href="/blog/"${o.currentCategory ? '' : ' aria-current="page"'}>Todos</a></li>`,
    ...o.categories.map(
      (c) => `<li><a href="/category/${c.slug}/"${o.currentCategory === c.slug ? ' aria-current="page"' : ''}>${esc(c.name)}</a></li>`,
    ),
  ].join('');

  const nums: string[] = [];
  for (let p = 1; p <= o.pages; p++) {
    nums.push(
      p === o.page
        ? `<li><span aria-current="page">${p}</span></li>`
        : `<li><a href="${pageUrl(o.basePath, p)}" aria-label="Página ${p}">${p}</a></li>`,
    );
  }
  const pagination =
    o.pages > 1
      ? `<nav class="pagination" aria-label="Paginação">
      ${o.page > 1 ? `<a class="pagination__step" href="${pageUrl(o.basePath, o.page - 1)}" rel="prev">${o.icons.use('arrow-left')}Anteriores</a>` : '<span></span>'}
      <ol>${nums.join('')}</ol>
      ${o.page < o.pages ? `<a class="pagination__step" href="${pageUrl(o.basePath, o.page + 1)}" rel="next">Próximos${o.icons.use('arrow-right')}</a>` : '<span></span>'}
    </nav>`
      : '';

  const trail = o.currentCategory
    ? crumbs([{ href: '/', label: 'Início' }, { href: '/blog/', label: 'Blog' }, { label: o.heading }])
    : crumbs([{ href: '/', label: 'Início' }, { label: 'Blog' }]);

  return `<section class="page-hero theme-dark">
  <div class="container">
    ${trail}
    <h1 class="page-hero__title">${esc(o.heading)}${o.page > 1 ? ` <small>— página ${o.page}</small>` : ''}</h1>
    <p class="page-hero__lead">${esc(o.intro)}</p>
  </div>
</section>
<section class="section theme-light listing">
  <div class="container">
    <nav class="filters" aria-label="Categorias do blog"><ul>${filters}</ul></nav>
    <div class="cards">${o.posts.map((p, i) => postCard(p, o.cats, { eager: i < 3 })).join('\n')}</div>
    ${pagination}
  </div>
</section>
${ctaBand(o.icons)}`;
}

export function ctaBand(icons: Icons): string {
  return `<section class="cta-band theme-dark">
  <div class="container cta-band__inner">
    <div>
      <h2 class="cta-band__title">Seu patrimônio merece uma estratégia à altura.</h2>
      <p>${esc(site.minimum)}</p>
    </div>
    <a class="btn btn--gold" href="${esc(whatsappUrl('Olá, Rafaela! Li um artigo no seu blog e gostaria de conversar sobre os meus investimentos.'))}" target="_blank" rel="noopener noreferrer" data-wa="blog-cta">
      ${icons.use('whatsapp')}<span>Falar com a Rafaela</span>
    </a>
  </div>
</section>`;
}

/** Minibiografia da autora nos artigos. As certificações só entram depois de confirmadas. */
function authorBio(): string {
  const { employer, career, credentials, credentialsConfirmed } = site.person;
  const bio = `Assessora de investimentos vinculada à ${employer.name}, com passagens por ${career.slice(0, -1).join(' e ')}.`;
  if (!credentialsConfirmed) return bio;
  return `${bio} Certificações: ${new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(credentials.map((c) => c.name))}.`;
}

export function postPage(post: Post, related: Post[], cats: Map<string, Category>, icons: Icons): string {
  const cat = cats.get(post.categories[0] ?? '');
  const updated = post.modified.slice(0, 10) !== post.date.slice(0, 10);
  const toc =
    post.toc.length >= 3
      ? `<details class="toc" open>
      <summary>Neste artigo${icons.use('chevron-down')}</summary>
      <ol>${post.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol>
    </details>`
      : '';
  return `<article class="post">
  <header class="page-hero theme-dark">
    <div class="container container--narrow">
      ${crumbs([
        { href: '/', label: 'Início' },
        { href: '/blog/', label: 'Blog' },
        ...(cat ? [{ href: `/category/${cat.slug}/`, label: cat.name }] : []),
      ])}
      <h1 class="page-hero__title">${esc(post.title)}</h1>
      <p class="page-hero__lead">${esc(post.description)}</p>
      <p class="post__meta">
        <span>Por <a href="/#sobre" rel="author">${esc(site.person.name)}</a></span>
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        ${updated ? `<span>Atualizado em <time datetime="${post.modified}">${formatDate(post.modified)}</time></span>` : ''}
        <span>${post.minutes} min de leitura</span>
      </p>
    </div>
  </header>
  <div class="theme-light post__wrap">
    <div class="container container--narrow">
      <figure class="post__cover">${picture(post.image, { alt: post.title, sizes: '(min-width: 56em) 800px, 100vw', eager: true })}</figure>
      ${toc}
      <div class="prose">
${post.html}
      </div>
      <p class="post__disclaimer">Este conteúdo tem caráter informativo e não constitui recomendação de investimento. Investimentos envolvem riscos; avalie o seu perfil antes de decidir.</p>
      <aside class="author">
        ${picture('rafaela-alves-eqi-investimentos', { alt: 'Rafaela Alves, assessora de investimentos vinculada à EQI', sizes: '96px', maxWidth: 420, class: 'author__photo' })}
        <div>
          <p class="author__name">${esc(site.person.name)}</p>
          <p>${esc(authorBio())}</p>
          <a class="textlink" href="/#sobre">Conheça a trajetória da Rafaela ${icons.use('arrow-right')}</a>
        </div>
      </aside>
    </div>
  </div>
</article>
${
  related.length
    ? `<section class="section theme-light related">
  <div class="container">
    <h2 class="section__title">Continue lendo</h2>
    <div class="cards">${related.map((p) => postCard(p, cats, { heading: 'h3' })).join('\n')}</div>
  </div>
</section>`
    : ''
}
${ctaBand(icons)}`;
}

export function legalPage(page: LegalPage, icons: Icons): string {
  return `<header class="page-hero theme-dark">
  <div class="container container--narrow">
    ${crumbs([{ href: '/', label: 'Início' }, { label: page.title }])}
    <h1 class="page-hero__title">${esc(page.title)}</h1>
    <p class="post__meta"><span>Última atualização: <time datetime="${page.modified}">${formatDate(page.modified)}</time></span></p>
  </div>
</header>
<div class="theme-light post__wrap">
  <div class="container container--narrow">
    <div class="prose">
${page.html}
    </div>
    <p class="post__disclaimer">Dúvidas sobre este documento? <a href="${esc(whatsappUrl('Olá! Tenho uma dúvida sobre as políticas do site.'))}" target="_blank" rel="noopener noreferrer">Fale comigo pelo WhatsApp ${icons.use('arrow-up-right')}</a></p>
  </div>
</div>`;
}

export function thanksPage(icons: Icons): string {
  return `<section class="page-hero theme-dark notfound">
  <div class="container container--narrow">
    <h1 class="page-hero__title">Obrigada pelo contato</h1>
    <p class="page-hero__lead">Recebemos o seu contato e retornaremos pelo WhatsApp. Se quiser adiantar a conversa, envie uma mensagem agora.</p>
    <p class="notfound__actions">
      <a class="btn btn--gold" href="${esc(whatsappUrl('Olá, Rafaela! Acabei de enviar meus dados pelo formulário do site.'))}" target="_blank" rel="noopener noreferrer" data-wa="obrigado">${icons.use('whatsapp')}<span>Falar com a Rafaela</span></a>
      <a class="btn btn--outline" href="/">Voltar para a página inicial</a>
    </p>
  </div>
</section>`;
}

export function notFoundPage(latest: Post[], cats: Map<string, Category>, icons: Icons): string {
  return `<section class="page-hero theme-dark notfound">
  <div class="container container--narrow">
    <p class="notfound__code" aria-hidden="true">404</p>
    <h1 class="page-hero__title">Esta página não existe mais</h1>
    <p class="page-hero__lead">O endereço pode ter mudado ou sido digitado com erro. Veja por onde continuar:</p>
    <p class="notfound__actions">
      <a class="btn btn--gold" href="/">Ir para a página inicial ${icons.use('arrow-right')}</a>
      <a class="btn btn--outline" href="/blog/">Ver os artigos do blog</a>
    </p>
  </div>
</section>
<section class="section theme-light related">
  <div class="container">
    <h2 class="section__title">Artigos recentes</h2>
    <div class="cards">${latest.map((p) => postCard(p, cats, { heading: 'h3' })).join('\n')}</div>
  </div>
</section>`;
}
