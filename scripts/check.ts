/**
 * Verificação do build (rode depois de `npm run build`):
 *
 *   npm run check
 *
 * Confere, em todas as páginas de dist/: um único <h1>, title/description/canonical, JSON-LD
 * válido, imagens e links internos que realmente existem, FAQ visível = FAQ do schema e
 * URLs do sitemap. Sai com código 1 se houver erro (avisos não derrubam).
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const errors: string[] = [];
const warnings: string[] = [];

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const redirects = existsSync(path.join(DIST, '_redirects'))
  ? (await readFile(path.join(DIST, '_redirects'), 'utf8'))
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .map((l) => l.trim().split(/\s+/)[0] as string)
  : [];

/** O caminho público existe como arquivo, como pasta com index.html ou como regra de redirecionamento? */
function resolves(urlPath: string): boolean {
  const clean = decodeURIComponent(urlPath.split('#')[0]?.split('?')[0] ?? '');
  if (clean === '' || clean === '/') return true;
  if (clean.startsWith('/api/')) return true;
  if (redirects.some((r) => (r.endsWith('*') ? clean.startsWith(r.slice(0, -1)) : r === clean))) return true;
  const file = path.join(DIST, clean);
  return clean.endsWith('/') ? existsSync(path.join(file, 'index.html')) : existsSync(file);
}

const files = await htmlFiles(DIST);
const titles = new Map<string, string>();

for (const file of files) {
  const rel = `/${path.relative(DIST, file).replace(/\\/g, '/')}`;
  const page = rel.replace(/index\.html$/, '');
  const html = await readFile(file, 'utf8');
  const fail = (msg: string): number => errors.push(`${page}: ${msg}`);
  const warn = (msg: string): number => warnings.push(`${page}: ${msg}`);
  const indexable = !/<meta name="robots" content="noindex/.test(html);

  if (/\{\{|<x-(icon|img)\b/.test(html)) fail('marcação de template não expandida');
  if (!/<html lang="pt-BR"/.test(html)) fail('sem lang="pt-BR"');

  const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1 !== 1) fail(`${h1} elementos <h1> (esperado: 1)`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (!title) fail('sem <title>');
  else if (indexable) {
    if (title.length > 70) warn(`title com ${title.length} caracteres`);
    const dup = titles.get(title);
    // No blog, títulos repetidos vêm do conteúdo original do WordPress (posts publicados em duplicidade): só avisa.
    if (dup) (page.split('/').length > 3 || page === '/' ? fail : warn)(`title duplicado com ${dup}`);
    titles.set(title, page);
  }

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) fail('sem meta description');
  else if (indexable && (desc.length < 70 || desc.length > 170)) warn(`description com ${desc.length} caracteres`);

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  if (!canonical) fail('sem canonical');
  else if (indexable && !canonical.endsWith(page)) fail(`canonical (${canonical}) não bate com a URL`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1] as string);
    } catch {
      fail('JSON-LD inválido');
    }
  }

  // imagens e demais arquivos locais referenciados
  const assets = new Set<string>();
  for (const m of html.matchAll(/\s(?:src|href)="(\/[^"#?]*\.[a-z0-9]{2,5})"/g)) assets.add(m[1] as string);
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const part of (m[1] as string).split(',')) assets.add(part.trim().split(/\s+/)[0] as string);
  }
  for (const a of assets) if (a.startsWith('/') && !resolves(a)) fail(`arquivo inexistente: ${a}`);

  // links internos
  for (const m of html.matchAll(/<a\s[^>]*href="(\/[^"]*)"/g)) {
    if (!resolves(m[1] as string)) fail(`link interno quebrado: ${m[1]}`);
  }
  // âncoras da própria página
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!html.includes(`id="${m[1]}"`)) fail(`âncora sem destino: #${m[1]}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) fail(`<img> sem alt: ${m[0].slice(0, 80)}`);
    if (!/\swidth=/.test(m[0]) || !/\sheight=/.test(m[0])) fail(`<img> sem width/height: ${m[0].slice(0, 80)}`);
  }

  if (page === '/') {
    const visible = html.match(/<details class="faq__item"/g)?.length ?? 0;
    const inSchema = html.match(/"@type":"Question"/g)?.length ?? 0;
    if (visible !== inSchema) fail(`FAQ visível (${visible}) ≠ FAQ no schema (${inSchema})`);
    for (const id of ['sobre', 'assessoria', 'eqi', 'avaliacao', 'faq', 'contato']) {
      if (!html.includes(`id="${id}"`)) fail(`seção #${id} ausente`);
    }
    if (!html.includes('href="https://p12digital.com.br/"')) fail('crédito da P12 Digital ausente no rodapé');
  }
}

const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1] as string);
for (const loc of locs) if (!resolves(loc)) errors.push(`sitemap: URL sem página: ${loc}`);
for (const required of ['robots.txt', 'llms.txt', 'llms-full.txt', 'feed.xml', 'site.webmanifest', '_headers', '_redirects', '404.html', 'og-rafaela-alves.jpg']) {
  if (!existsSync(path.join(DIST, required))) errors.push(`arquivo obrigatório ausente: ${required}`);
}

for (const w of warnings.slice(0, 40)) console.warn(`aviso  ${w}`);
if (warnings.length > 40) console.warn(`… e mais ${warnings.length - 40} avisos`);
for (const e of errors) console.error(`ERRO   ${e}`);
console.log(`\n${files.length} páginas, ${locs.length} URLs no sitemap — ${errors.length} erros, ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
