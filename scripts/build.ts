/**
 * Build do site → dist/
 *
 *   npm run build
 *
 * 1. copia public/ (imagens, fontes e ícones já otimizados)
 * 2. empacota o TypeScript do navegador (esbuild) com hash no nome
 * 3. minifica o CSS (lightningcss) e o embute em cada página — zero requisições bloqueantes
 * 4. renderiza home, blog, categorias, posts, páginas institucionais e 404
 * 5. gera sitemap.xml, robots.txt, llms.txt, llms-full.txt, feed.xml, manifest, _headers e _redirects
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build as esbuild } from 'esbuild';
import { minify } from 'html-minifier-terser';
import { transform } from 'lightningcss';
import { eqi, faqs, offers, reasons, stats, testimonials } from '../src/content.ts';
import { site, whatsappUrl } from '../src/site.config.ts';
import { abs, esc, expand, Icons, picture, preloadImage, ROOT, setManifest, image, type Manifest } from './lib/html.ts';
import * as schema from './lib/schema.ts';
import {
  legalPage,
  listingPage,
  notFoundPage,
  pageUrl,
  postCard,
  postPage,
  thanksPage,
  type Category,
  type LegalPage,
  type Post,
} from './templates/blog.ts';
import { homeVars } from './templates/home.ts';
import { layout, type PageMeta, type Shell } from './templates/layout.ts';

const DIST = path.join(ROOT, 'dist');
const now = new Date();
const BUILD_DATE = now.toISOString();
const YEAR = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(now));

/* ------------------------------------------------------------------ assets */

async function bundleScripts(): Promise<Record<'home' | 'site', string>> {
  const result = await esbuild({
    entryPoints: { home: path.join(ROOT, 'src/client/home.ts'), site: path.join(ROOT, 'src/client/site.ts') },
    bundle: true,
    format: 'esm',
    target: ['es2020', 'safari15'],
    minify: true,
    legalComments: 'none',
    outdir: path.join(DIST, 'assets'),
    entryNames: '[name]-[hash]',
    metafile: true,
    logLevel: 'warning',
  });
  const out: Partial<Record<'home' | 'site', string>> = {};
  for (const [file, info] of Object.entries(result.metafile.outputs)) {
    const name = info.entryPoint?.includes('home.ts') ? 'home' : 'site';
    out[name] = `/assets/${path.basename(file)}`;
  }
  if (!out.home || !out.site) throw new Error('esbuild não gerou os dois bundles esperados');
  return out as Record<'home' | 'site', string>;
}

async function css(files: string[]): Promise<string> {
  const source = (await Promise.all(files.map((f) => readFile(path.join(ROOT, 'src/styles', f), 'utf8')))).join('\n');
  const { code, warnings } = transform({
    filename: files.join('+'),
    code: Buffer.from(source),
    minify: true,
    errorRecovery: true,
    targets: { chrome: 109 << 16, edge: 109 << 16, firefox: 115 << 16, safari: (15 << 16) | (4 << 8), ios_saf: (15 << 16) | (4 << 8) },
  });
  for (const w of warnings) console.warn(`  css: ${w.message} (${w.loc?.line}:${w.loc?.column})`);
  return code.toString();
}

/* ---------------------------------------------------------------- conteúdo */

function parseDoc<T>(raw: string): { meta: T; html: string } {
  const m = raw.match(/^<!--\s*([\s\S]*?)\s*-->\s*/);
  if (!m?.[1]) throw new Error('arquivo de conteúdo sem front-matter');
  return { meta: JSON.parse(m[1]) as T, html: raw.slice(m[0].length).trim() };
}

const strip = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function loadPosts(): Promise<Post[]> {
  const dir = path.join(ROOT, 'content/posts');
  const posts: Post[] = [];
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.html'))) {
    const { meta, html } = parseDoc<Omit<Post, 'html' | 'toc' | 'words' | 'minutes'>>(await readFile(path.join(dir, file), 'utf8'));
    const body = html
      // imagem do corpo → <picture> responsivo; se o arquivo não existir, remove o bloco
      .replace(/<figure><img data-img="([^"]+)" alt="([^"]*)"><\/figure>/g, (_, name: string, alt: string) =>
        image(name) ? `<figure>${picture(name, { alt, sizes: '(min-width: 56em) 800px, 100vw' })}</figure>` : '',
      )
      .replace(/<img data-img="([^"]+)" alt="([^"]*)">/g, (_, name: string, alt: string) =>
        image(name) ? picture(name, { alt, sizes: '(min-width: 56em) 800px, 100vw' }) : '',
      );
    const toc = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1] as string, text: strip(m[2] as string) }));
    const words = strip(body).split(' ').length;
    posts.push({ ...meta, html: body, toc, words, minutes: Math.max(1, Math.round(words / 220)) });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

async function loadLegal(): Promise<LegalPage[]> {
  const dir = path.join(ROOT, 'content/pages');
  const pages: LegalPage[] = [];
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.html'))) {
    const { meta, html } = parseDoc<Omit<LegalPage, 'html'>>(await readFile(path.join(dir, file), 'utf8'));
    pages.push({ ...meta, html });
  }
  return pages;
}

/* ------------------------------------------------------------------- saída */

const written: string[] = [];

async function writePage(pagePath: string, html: string): Promise<void> {
  const file = pagePath.endsWith('/') ? path.join(DIST, pagePath, 'index.html') : path.join(DIST, pagePath);
  const min = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    collapseBooleanAttributes: true,
    minifyJS: true,
    decodeEntities: true,
    removeScriptTypeAttributes: false,
  });
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, min);
  written.push(pagePath);
}

const writeText = async (name: string, content: string): Promise<void> => writeFile(path.join(DIST, name), content);

/** Corta em limite de palavra (meta description e afins). */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s—-]+$/, '')}…`;
}

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/* -------------------------------------------------------------------- main */

async function main(): Promise<void> {
  const t0 = performance.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(path.join(ROOT, 'public'), DIST, { recursive: true });

  setManifest(JSON.parse(await readFile(path.join(ROOT, 'content/images.json'), 'utf8')) as Manifest);
  const [scripts, homeCss, blogCss, posts, legal, categories] = await Promise.all([
    bundleScripts(),
    css(['base.css', 'home.css']),
    css(['base.css', 'blog.css']),
    loadPosts(),
    loadLegal(),
    readFile(path.join(ROOT, 'content/categories.json'), 'utf8').then((s) => JSON.parse(s) as Category[]),
  ]);
  const cats = new Map(categories.map((c) => [c.slug, c]));
  const shellFor = (): Shell => ({ icons: new Icons(), year: YEAR, categories });
  const latestModified = posts.reduce((max, p) => (p.modified > max ? p.modified : max), posts[0]?.modified ?? BUILD_DATE);

  /* ---- home ---- */
  {
    const shell = shellFor();
    const latest = posts.slice(0, 3).map((p) => postCard(p, cats, { heading: 'h3' })).join('\n');
    const source = (await readFile(path.join(ROOT, 'src/pages/home.html'), 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
    const main = expand(source, { icons: shell.icons, vars: homeVars(shell.icons, latest) });
    const title = 'Assessoria de Investimentos Alta Renda | Rafaela Alves – EQI';
    const description =
      'Assessora de investimentos na EQI, com mais de R$ 500 milhões gerenciados. Estratégia sob medida para alta renda e assessoria gratuita a partir de R$ 300 mil.';
    const meta: PageMeta = {
      path: '/',
      title,
      description,
      css: homeCss,
      script: scripts.home,
      preloads: [preloadImage('rafaela-alves-assessora-de-investimentos', '(min-width: 62em) 440px, (min-width: 40em) 52vw, 82vw')],
      graph: [
        schema.website(),
        schema.webPage({ path: '/', title, description, type: 'ProfilePage', modified: BUILD_DATE, about: true }),
        schema.person(),
        schema.service(),
        schema.faqPage('/'),
      ],
    };
    await writePage('/', layout(meta, main, shell));
  }

  /* ---- blog e categorias ---- */
  const blogIntro =
    'Análises e guias sobre fundos imobiliários, fundos de investimento e produtos para investidor qualificado — escritos para quem investe com visão de longo prazo.';
  const listings: Array<{ basePath: string; heading: string; intro: string; items: Post[]; category?: Category }> = [
    { basePath: '/blog/', heading: 'Blog de investimentos para alta renda', intro: blogIntro, items: posts },
    ...categories.map((c) => ({
      basePath: `/category/${c.slug}/`,
      heading: c.slug === 'outros' ? 'Outros temas de investimento' : c.name,
      intro: c.description || 'Artigos sobre economia, mercado financeiro e tendências de investimento.',
      items: posts.filter((p) => p.categories.includes(c.slug)),
      category: c,
    })),
  ];
  for (const l of listings) {
    const pages = chunk(l.items, site.blog.perPage);
    for (const [i, pagePosts] of pages.entries()) {
      const page = i + 1;
      const shell = shellFor();
      const pagePath = pageUrl(l.basePath, page);
      const suffix = page > 1 ? ` – Página ${page}` : '';
      const shortHeading = l.category?.slug === 'fundos-de-investimento-imobiliario-fii' ? 'Fundos Imobiliários (FII)' : l.heading;
      const title = `${l.category ? `${shortHeading} – Blog` : 'Blog de Investimentos para Alta Renda'}${suffix} | Rafaela Alves`;
      const description = truncate(page > 1 ? `Página ${page} de ${pages.length}: ${l.intro}` : l.intro, 160);
      const main = listingPage({
        heading: l.heading,
        intro: l.intro,
        posts: pagePosts,
        page,
        pages: pages.length,
        basePath: l.basePath,
        categories,
        currentCategory: l.category?.slug,
        cats,
        icons: shell.icons,
      });
      const trail = [
        { name: 'Início', path: '/' },
        { name: 'Blog', path: '/blog/' },
        ...(l.category ? [{ name: l.heading, path: l.basePath }] : []),
      ];
      const firstImage = pagePosts[0] ? preloadImage(pagePosts[0].image, '(min-width: 62em) 370px, (min-width: 40em) 46vw, 92vw') : '';
      await writePage(
        pagePath,
        layout(
          {
            path: pagePath,
            title,
            description,
            css: blogCss,
            script: scripts.site,
            preloads: [firstImage],
            ...(page > 1 ? { prev: pageUrl(l.basePath, page - 1) } : {}),
            ...(page < pages.length ? { next: pageUrl(l.basePath, page + 1) } : {}),
            graph: [
              schema.website(),
              schema.webPage({ path: pagePath, title, description, type: 'CollectionPage', modified: latestModified, hasBreadcrumb: true }),
              schema.breadcrumb(pagePath, trail),
              schema.itemList(pagePath, pagePosts),
              schema.person(),
            ],
          },
          main,
          shell,
        ),
      );
    }
  }

  /* ---- posts ---- */
  for (const post of posts) {
    const shell = shellFor();
    const sameCat = posts.filter((p) => p.slug !== post.slug && p.categories.some((c) => post.categories.includes(c)));
    const idx = sameCat.findIndex((p) => p.date < post.date);
    // "Continue lendo": os artigos da mesma categoria mais próximos na linha do tempo.
    const start = Math.max(0, Math.min(sameCat.length - 3, (idx < 0 ? sameCat.length : idx) - 1));
    const related = sameCat.slice(start, start + 3);
    const pagePath = `/${post.slug}/`;
    const cover = image(post.image);
    const cat = cats.get(post.categories[0] ?? '');
    // Títulos longos já ocupam a linha inteira do resultado de busca: o sufixo da marca só entra quando cabe.
    const title = post.title.length > 50 ? post.title : `${post.title} | Rafaela Alves`;
    const coverWidth = cover?.fallback.widths[cover.fallback.widths.length - 1];
    await writePage(
      pagePath,
      layout(
        {
          path: pagePath,
          title,
          description: post.description,
          css: blogCss,
          script: scripts.site,
          ogType: 'article',
          article: { published: post.date, modified: post.modified, section: cat?.name },
          preloads: [preloadImage(post.image, '(min-width: 56em) 800px, 100vw')],
          ...(cover && coverWidth
            ? {
                ogImage: {
                  url: `${cover.base}-${coverWidth}.${cover.fallback.ext}`,
                  width: coverWidth,
                  height: Math.round((coverWidth / cover.width) * cover.height),
                  alt: post.title,
                },
              }
            : {}),
          graph: [
            schema.website(),
            schema.webPage({ path: pagePath, title, description: post.description, modified: post.modified, hasBreadcrumb: true }),
            schema.breadcrumb(pagePath, [
              { name: 'Início', path: '/' },
              { name: 'Blog', path: '/blog/' },
              ...(cat ? [{ name: cat.name, path: `/category/${cat.slug}/` }] : []),
              { name: post.title, path: pagePath },
            ]),
            schema.blogPosting(post, cats),
            schema.person(),
          ],
        },
        postPage(post, related, cats, shell.icons),
        shell,
      ),
    );
  }

  /* ---- institucionais ---- */
  const legalDescriptions: Record<string, string> = {
    'politica-de-privacidade':
      'Política de Privacidade do site de Rafaela Alves, assessora de investimentos: como os seus dados pessoais são coletados, usados e protegidos, conforme a LGPD.',
    'termos-de-uso-assessora-rafaela-alves':
      'Termos de Uso do site de Rafaela Alves, assessora de investimentos na EQI: condições de acesso, propriedade intelectual, links externos e lei aplicável.',
  };
  for (const page of legal) {
    const shell = shellFor();
    const pagePath = `/${page.slug}/`;
    const title = `${page.title} | Rafaela Alves – Assessora de Investimentos`;
    const description = legalDescriptions[page.slug] ?? `${page.title} do site de Rafaela Alves, assessora de investimentos na EQI.`;
    await writePage(
      pagePath,
      layout(
        {
          path: pagePath,
          title,
          description,
          css: blogCss,
          script: scripts.site,
          graph: [
            schema.website(),
            schema.webPage({ path: pagePath, title, description, modified: page.modified, hasBreadcrumb: true }),
            schema.breadcrumb(pagePath, [
              { name: 'Início', path: '/' },
              { name: page.title, path: pagePath },
            ]),
          ],
        },
        legalPage(page, shell.icons),
        shell,
      ),
    );
  }

  /* ---- 404 ---- */
  {
    const shell = shellFor();
    await writePage(
      '/404.html',
      layout(
        {
          path: '/404.html',
          title: 'Página não encontrada | Rafaela Alves',
          description: 'A página que você procura não existe ou mudou de endereço.',
          css: blogCss,
          script: scripts.site,
          robots: 'noindex, follow',
          graph: [],
        },
        notFoundPage(posts.slice(0, 3), cats, shell.icons),
        shell,
      ),
    );
  }

  /* ---- confirmação do formulário (destino do envio sem JavaScript) ---- */
  {
    const shell = shellFor();
    await writePage(
      '/obrigado/',
      layout(
        {
          path: '/obrigado/',
          title: 'Obrigada pelo contato | Rafaela Alves',
          description: 'Confirmação de envio do formulário de contato.',
          css: blogCss,
          script: scripts.site,
          robots: 'noindex, follow',
          graph: [],
        },
        thanksPage(shell.icons),
        shell,
      ),
    );
  }

  /* ---- sitemap.xml ---- */
  const urls: Array<{ loc: string; lastmod: string; image?: string }> = [
    { loc: '/', lastmod: BUILD_DATE },
    { loc: '/blog/', lastmod: latestModified },
    ...categories.map((c) => ({
      loc: `/category/${c.slug}/`,
      lastmod: posts.filter((p) => p.categories.includes(c.slug)).reduce((m, p) => (p.modified > m ? p.modified : m), ''),
    })),
    ...posts.map((p) => {
      const im = image(p.image);
      const w = im?.fallback.widths[im.fallback.widths.length - 1];
      return { loc: `/${p.slug}/`, lastmod: p.modified, ...(im && w ? { image: `${im.base}-${w}.${im.fallback.ext}` } : {}) };
    }),
    ...legal.map((p) => ({ loc: `/${p.slug}/`, lastmod: p.modified })),
  ];
  await writeText(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) =>
      `  <url><loc>${abs(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}${
        u.image ? `<image:image><image:loc>${abs(u.image)}</image:loc></image:image>` : ''
      }</url>`,
  )
  .join('\n')}
</urlset>
`,
  );

  /* ---- robots.txt ---- */
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent',
    'MistralAI-User', 'DuckAssistBot', 'CCBot',
  ];
  await writeText(
    'robots.txt',
    `# ${site.name}
# ${site.url}

User-agent: *
Allow: /
Disallow: /api/

# Buscadores e assistentes de IA: acesso liberado ao conteúdo público.
# Resumo para LLMs em ${site.url}/llms.txt
${aiBots.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /
Disallow: /api/

Sitemap: ${site.url}/sitemap.xml
`,
  );

  /* ---- llms.txt / llms-full.txt ---- */
  const byCat = categories.map((c) => ({ c, items: posts.filter((p) => p.categories[0] === c.slug) }));
  const summary =
    'Rafaela Alves é assessora de investimentos na EQI Investimentos, com certificações Ancord, CEA e CPA-20, passagens por Santander Select e XP Investimentos e mais de R$ 500 milhões gerenciados ao longo da carreira. Atende investidores de alta renda — pessoa física e empresas — em todo o Brasil, com assessoria gratuita para clientes com investimentos a partir de R$ 300.000,00.';
  const llmsHead = `# ${site.name}

> ${summary}

- Site: ${site.url}/
- Contato: WhatsApp ${site.whatsapp.display} (${whatsappUrl()})
- Idioma: português (Brasil)
- Atuação: assessoria de investimentos para alta renda; atendimento em todo o Brasil, com soluções para o mercado local e internacional
- Instituição: EQI Investimentos (${site.person.employer.url}), que tem o BTG Pactual como parceiro estratégico e custodiante

Os artigos do blog têm caráter informativo e não constituem recomendação de investimento.
`;
  await writeText(
    'llms.txt',
    `${llmsHead}
## Páginas principais

- [Página inicial](${site.url}/): apresentação, serviços, diferenciais da EQI, depoimentos, perguntas frequentes e contato
- [Sobre Rafaela Alves](${site.url}/#sobre): trajetória, certificações e forma de atuação
- [Perguntas frequentes](${site.url}/#faq): como funciona a assessoria, custos, abertura de conta e quem é atendido
- [Contato](${site.url}/#contato): formulário e WhatsApp
- [Blog](${site.url}/blog/): ${posts.length} artigos sobre investimentos
- [Conteúdo completo para LLMs](${site.url}/llms-full.txt): textos da página inicial e resumo de todos os artigos

${byCat
  .filter((g) => g.items.length)
  .map(
    (g) => `## Blog — ${g.c.name}

${g.items
  .slice(0, 15)
  .map((p) => `- [${p.title}](${abs(`/${p.slug}/`)}): ${p.description}`)
  .join('\n')}${g.items.length > 15 ? `\n- [Mais ${g.items.length - 15} artigos desta categoria](${abs(`/category/${g.c.slug}/`)})` : ''}`,
  )
  .join('\n\n')}

## Opcional

- [Política de Privacidade](${site.url}/politica-de-privacidade/)
- [Termos de Uso](${site.url}/termos-de-uso-assessora-rafaela-alves/)
- [Sitemap](${site.url}/sitemap.xml)
- [Feed RSS](${site.url}/feed.xml)
`,
  );
  const list = (items: Array<{ title: string; text: string }>): string => items.map((i) => `- **${i.title}:** ${i.text}`).join('\n');
  await writeText(
    'llms-full.txt',
    `${llmsHead}
## Sobre Rafaela Alves

Com uma trajetória consolidada no atendimento a clientes de alta renda, Rafaela Alves acumula passagens por instituições como Santander Select e XP Investimentos. Atualmente na EQI Investimentos, traz a experiência de ter gerenciado mais de R$ 500 milhões ao longo da carreira, atendendo investidores em todo o Brasil com soluções para o mercado local e internacional. Sua missão é ser a parceira estratégica de clientes que buscam mais do que rentabilidade: uma orientação personalizada, técnica e focada na preservação e no crescimento de patrimônio.

Ao contrário do ambiente bancário tradicional, onde metas muitas vezes ofuscam a qualidade do atendimento, Rafaela atua com liberdade nas recomendações e atende uma carteira mais seleta, o que permite atenção personalizada e respostas rápidas.

Números: ${stats.map((s) => `${s.prefix}${s.value}${s.suffix} ${s.label.toLowerCase()}`).join('; ')}.

## Por que escolher a assessoria

${list(reasons)}

## O que a assessoria oferece

${list(offers)}

## Por que investir com a EQI Investimentos

A EQI Investimentos não é apenas uma corretora, mas uma das maiores casas de assessoria do Brasil, com a solidez de ter o BTG Pactual — o maior banco de investimentos da América Latina — como parceiro estratégico e custodiante.

${list(eqi)}

## Perguntas frequentes

${faqs.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Depoimentos de clientes

${testimonials.map((t) => `- “${t.text}” — ${t.name}`).join('\n')}

## Artigos do blog

${posts.map((p) => `- [${p.title}](${abs(`/${p.slug}/`)}) (${p.date.slice(0, 10)}): ${p.description}`).join('\n')}
`,
  );

  /* ---- feed.xml ---- */
  const xml = (s: string): string => esc(s).replace(/'/g, '&apos;');
  await writeText(
    'feed.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xml(site.name)} — Blog</title>
  <link>${site.url}/blog/</link>
  <description>${xml(blogIntro)}</description>
  <language>pt-BR</language>
  <lastBuildDate>${new Date(latestModified).toUTCString()}</lastBuildDate>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
${posts
  .slice(0, 30)
  .map(
    (p) => `  <item>
    <title>${xml(p.title)}</title>
    <link>${abs(`/${p.slug}/`)}</link>
    <guid isPermaLink="true">${abs(`/${p.slug}/`)}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${xml(p.description)}</description>
  </item>`,
  )
  .join('\n')}
</channel>
</rss>
`,
  );

  /* ---- manifest ---- */
  await writeText(
    'site.webmanifest',
    JSON.stringify({
      name: site.name,
      short_name: site.shortName,
      description: 'Assessoria de investimentos para alta renda.',
      lang: site.locale,
      start_url: '/',
      display: 'browser',
      background_color: site.themeColor,
      theme_color: site.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
  );

  /* ---- _headers ---- */
  await writeText(
    '_headers',
    `# Cabeçalhos dos arquivos estáticos (Cloudflare Workers Static Assets).

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests

# Arquivos com hash ou nome estável: cache longo e imutável.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=31536000, immutable

/sitemap.xml
  Cache-Control: public, max-age=3600
/feed.xml
  Cache-Control: public, max-age=3600
/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600

# Early Hints: o navegador começa a baixar as fontes críticas antes do HTML chegar.
/
  Link: </fonts/bodoni-moda.woff2>; rel=preload; as=font; type=font/woff2; crossorigin
  Link: </fonts/poppins-400.woff2>; rel=preload; as=font; type=font/woff2; crossorigin

# URLs de teste (*.workers.dev) não devem ser indexadas — só o domínio oficial.
https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
`,
  );

  /* ---- _redirects ---- */
  await writeText(
    '_redirects',
    `# Redirecionamentos de URLs do WordPress antigo (301 = permanente).
/home / 301
/home/ / 301
/teste-af / 301
/teste-af/ / 301
/blog/page/1/ /blog/ 301
/category/uncategorized/ /blog/ 301
/feed /feed.xml 301
/feed/ /feed.xml 301
/comments/feed/ /feed.xml 301
/sitemap_index.xml /sitemap.xml 301
/post-sitemap.xml /sitemap.xml 301
/page-sitemap.xml /sitemap.xml 301
/category-sitemap.xml /sitemap.xml 301
/post_tag-sitemap.xml /sitemap.xml 301
/author-sitemap.xml /sitemap.xml 301
/wp-sitemap.xml /sitemap.xml 301
/tag/* /blog/ 301
/author/* / 301
`,
  );

  if (!image('rafaela-alves-assessora-de-investimentos')) console.warn('  ! imagem do hero ausente no manifesto');
  const ms = Math.round(performance.now() - t0);
  console.log(`build ok — ${written.length} páginas em ${ms} ms → dist/`);
}

await main();
