/**
 * Importação única do conteúdo do WordPress original (REST API) para arquivos estáticos.
 *
 *   npm run import:wp
 *
 * Gera:
 *   content/posts/<slug>.html     → post com front-matter JSON em comentário + HTML limpo
 *   content/pages/<slug>.html     → páginas institucionais (privacidade, termos)
 *   content/categories.json       → categorias do blog
 *   .cache/wp/blog/*              → imagens originais (não versionadas; entrada do `npm run images`)
 *
 * Depois que o WordPress for desligado este script deixa de funcionar — o conteúdo
 * passa a viver em `content/` e pode ser editado direto nos arquivos .html.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';

const ORIGIN = 'https://assessorarafaela.com.br';
const UA = 'Mozilla/5.0 (compatible; site-migration/1.0)';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_POSTS = path.join(ROOT, 'content/posts');
const OUT_PAGES = path.join(ROOT, 'content/pages');
const CACHE_IMG = path.join(ROOT, '.cache/wp/blog');

const LEGAL_PAGES: Record<string, { slug: string; title: string }> = {
  'politica-de-privacidade': { slug: 'politica-de-privacidade', title: 'Política de Privacidade' },
  'termos-de-uso-assessora-rafaela-alves': {
    slug: 'termos-de-uso-assessora-rafaela-alves',
    title: 'Termos de Uso',
  },
};

interface WpRendered {
  rendered: string;
}
interface WpPost {
  id: number;
  slug: string;
  date_gmt: string;
  modified_gmt: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  categories: number[];
  yoast_head_json?: { description?: string; og_description?: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
  };
}
interface WpCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  count: number;
}
interface WpPage {
  slug: string;
  modified_gmt: string;
  content: WpRendered;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

const NBSP = /\xa0/g;
const decode = (html: string): string => load(`<i>${html}</i>`, null, false)('i').text();
const plain = (html: string): string => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/, '');
}

/** `/wp-content/uploads/2025/08/foo.jpg` → `2025-08-foo` (único mesmo quando o nome do arquivo se repete). */
export function imageName(url: string): string {
  const { pathname } = new URL(url, ORIGIN);
  const file = decodeURIComponent(path.basename(pathname)).replace(/\.[a-z0-9]+$/i, '');
  const m = pathname.match(/uploads\/(\d{4})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${slugify(file)}` : slugify(file);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

const ALLOWED = new Set([
  'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'br', 'hr',
  'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'figure', 'figcaption',
]);

/** Reduz HTML do WordPress/Elementor a marcação semântica limpa. */
function sanitize(html: string, knownPaths: Set<string>, images: Set<string>): string {
  const fixed = html
    .replace(/<(\/?)h1\b/gi, '<$1h2')
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const $: CheerioAPI = load(fixed, null, false);

  // Títulos de nível 5/6 viram h4 (o conteúdo original não tem hierarquia mais profunda que isso).
  $('h5, h6').each((_, el) => {
    el.tagName = 'h4';
  });

  // Remove wrappers sem valor semântico, mantendo o conteúdo.
  let changed = true;
  while (changed) {
    changed = false;
    $('*').each((_, el) => {
      if (el.type === 'tag' && !ALLOWED.has(el.tagName)) {
        $(el).replaceWith($(el).contents());
        changed = true;
      }
    });
  }

  $('*').each((_, el) => {
    if (el.type !== 'tag') return;
    const keep: Record<string, string> = {};
    if (el.tagName === 'a' && el.attribs.href) keep.href = el.attribs.href;
    if (el.tagName === 'img') {
      if (el.attribs.src) keep.src = el.attribs.src;
      keep.alt = (el.attribs.alt ?? '').trim();
    }
    if ((el.tagName === 'td' || el.tagName === 'th') && el.attribs.colspan) keep.colspan = el.attribs.colspan;
    if ((el.tagName === 'td' || el.tagName === 'th') && el.attribs.rowspan) keep.rowspan = el.attribs.rowspan;
    el.attribs = keep;
  });

  // Negrito dentro de título é ruído.
  $('h2, h3, h4').each((_, el) => {
    $(el)
      .find('strong, b')
      .each((__, s) => {
        $(s).replaceWith($(s).contents());
      });
  });
  $('b').each((_, el) => {
    el.tagName = 'strong';
  });
  $('i').each((_, el) => {
    el.tagName = 'em';
  });

  // Links: internos viram relativos; quebrados perdem o link; externos abrem em nova aba.
  $('a').each((_, el) => {
    const href = (el.attribs.href ?? '').trim();
    let url: URL;
    try {
      url = new URL(href, ORIGIN);
    } catch {
      $(el).replaceWith($(el).contents());
      return;
    }
    if (url.origin === ORIGIN) {
      const p = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      if (!knownPaths.has(p)) {
        $(el).replaceWith($(el).contents());
        return;
      }
      el.attribs = { href: p + url.hash };
    } else if (/^https?:$/.test(url.protocol)) {
      el.attribs = { href: url.href, target: '_blank', rel: 'noopener noreferrer' };
    } else {
      el.attribs = { href };
    }
  });

  // Imagens: referência local por nome (o build troca por <picture> responsivo).
  $('img').each((_, el) => {
    const src = el.attribs.src ?? '';
    if (!src.includes('/wp-content/uploads/')) {
      $(el).remove();
      return;
    }
    images.add(new URL(src, ORIGIN).href);
    el.attribs = { 'data-img': imageName(src), alt: el.attribs.alt ?? '' };
    const parent = $(el).parent();
    if (parent.is('p') && parent.text().trim() === '' && parent.children().length === 1) {
      parent.replaceWith($('<figure></figure>').append($(el).clone()));
    }
  });

  // Listas vizinhas do mesmo tipo (artefato da conversão markdown → HTML): junta em uma só.
  for (const tag of ['ul', 'ol'] as const) {
    $(tag).each((_, el) => {
      if (el.parent === null) return; // já foi fundida em uma lista anterior
      const $el = $(el);
      let next = $el.next();
      while (next.length && next.is(tag)) {
        const prevNode = next[0]?.prev;
        const between = prevNode && prevNode.type === 'text' ? prevNode.data.trim() : '';
        if (between) break;
        $el.append(next.children());
        const dead = next;
        next = next.next();
        dead.remove();
      }
    });
  }

  $('li').each((_, el) => {
    const first = el.children[0];
    const last = el.children[el.children.length - 1];
    if (first?.type === 'text') first.data = first.data.replace(/^\s+/, '');
    if (last?.type === 'text') last.data = last.data.replace(/\s+$/, '');
  });

  $('p, h2, h3, h4, li').each((_, el) => {
    const $el = $(el);
    if ($el.text().replace(NBSP, ' ').trim() === '' && $el.find('img').length === 0) $el.remove();
  });

  // Âncoras legíveis nos títulos (usadas pelo sumário).
  const used = new Set<string>();
  $('h2, h3').each((_, el) => {
    const base = slugify($(el).text()) || 'secao';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    el.attribs = { id };
  });

  $('table').each((_, el) => {
    $(el).wrap('<div class="table-scroll" role="region" tabindex="0" aria-label="Tabela (role para ver tudo)"></div>');
  });

  return $.html()
    .replace(NBSP, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/>\n(?=[^<\n])/g, '>')
    .replace(/([^>\n])\n(?=<\/)/g, '$1')
    .trim();
}

async function download(url: string, dest: string): Promise<void> {
  try {
    await access(dest);
    return;
  } catch {
    /* ainda não baixado */
  }
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/jpeg,image/png,*/*' } });
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${url}`);
    return;
  }
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) await fn(items[i++] as T);
    }),
  );
}

async function main(): Promise<void> {
  await Promise.all([OUT_POSTS, OUT_PAGES, CACHE_IMG].map((d) => mkdir(d, { recursive: true })));

  const [posts, categories, pages] = await Promise.all([
    getJson<WpPost[]>(`${ORIGIN}/wp-json/wp/v2/posts?per_page=100&_embed=wp:featuredmedia`),
    getJson<WpCategory[]>(`${ORIGIN}/wp-json/wp/v2/categories?per_page=100`),
    getJson<WpPage[]>(`${ORIGIN}/wp-json/wp/v2/pages?per_page=100`),
  ]);
  console.log(`posts: ${posts.length}, categorias: ${categories.length}, páginas: ${pages.length}`);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const knownPaths = new Set<string>(['/', '/blog/', ...posts.map((p) => `/${p.slug}/`)]);
  for (const p of Object.values(LEGAL_PAGES)) knownPaths.add(`/${p.slug}/`);

  const images = new Set<string>();

  for (const post of posts) {
    const featuredUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? '';
    if (featuredUrl) images.add(featuredUrl);
    const title = decode(post.title.rendered).trim();
    const excerpt = plain(post.excerpt.rendered);
    const yoastDesc = post.yoast_head_json?.description ?? post.yoast_head_json?.og_description ?? '';
    const cats = post.categories
      .map((id) => catById.get(id))
      .filter((c): c is WpCategory => c !== undefined && c.slug !== 'uncategorized')
      .map((c) => c.slug);
    const meta = {
      slug: post.slug,
      title,
      description: truncate(plain(yoastDesc) || excerpt, 158),
      excerpt: truncate(excerpt, 180),
      date: `${post.date_gmt}Z`,
      modified: `${post.modified_gmt}Z`,
      categories: cats,
      image: featuredUrl ? imageName(featuredUrl) : '',
    };
    const html = sanitize(post.content.rendered, knownPaths, images);
    await writeFile(
      path.join(OUT_POSTS, `${post.slug}.html`),
      `<!--\n${JSON.stringify(meta, null, 2)}\n-->\n${html}\n`,
    );
  }

  await writeFile(
    path.join(ROOT, 'content/categories.json'),
    `${JSON.stringify(
      categories
        .filter((c) => c.count > 0 && c.slug !== 'uncategorized')
        .map((c) => ({ slug: c.slug, name: decode(c.name), description: plain(c.description) })),
      null,
      2,
    )}\n`,
  );

  for (const page of pages) {
    const cfg = LEGAL_PAGES[page.slug];
    if (!cfg) continue;
    // O primeiro título repete o nome da página (que vira o <h1> no template).
    const html = sanitize(page.content.rendered, knownPaths, new Set()).replace(/^<h2[^>]*>[\s\S]*?<\/h2>\s*/, '');
    const meta = { slug: cfg.slug, title: cfg.title, modified: `${page.modified_gmt}Z` };
    await writeFile(path.join(OUT_PAGES, `${cfg.slug}.html`), `<!--\n${JSON.stringify(meta, null, 2)}\n-->\n${html}\n`);
  }

  console.log(`baixando ${images.size} imagens…`);
  await pool([...images], 8, async (url) => {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    await download(url, path.join(CACHE_IMG, `${imageName(url)}${ext}`));
  });
  console.log('ok');
}

await main();
