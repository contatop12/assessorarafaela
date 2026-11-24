/** Utilitários de geração de HTML usados pelo build (escape, ícones, <picture>, JSON-LD). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ImageEntry } from '../optimize-images.ts';
import { site, whatsappUrl } from '../../src/site.config.ts';

export const ROOT = path.resolve(import.meta.dirname, '../..');

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const abs = (p: string): string => (p.startsWith('http') ? p : `${site.url}${p}`);

/* ---------------------------------------------------------------- imagens */

export type Manifest = Record<string, ImageEntry>;
let manifest: Manifest = {};
export function setManifest(m: Manifest): void {
  manifest = m;
}
export const image = (name: string): ImageEntry | undefined => manifest[name];

export interface PictureOptions {
  alt: string;
  sizes: string;
  class?: string;
  /** Imagem acima da dobra: carrega já, com prioridade alta. */
  eager?: boolean;
  /** Acima da dobra, mas sem disputar banda com a imagem principal (ex.: logo do cabeçalho). */
  normalPriority?: boolean;
  /** Limita a maior largura usada (ex.: cards não precisam do arquivo de 1200px). */
  maxWidth?: number;
  /** Direção de arte: outro recorte (com proporção própria) quando a media query casar. */
  art?: { name: string; media: string; sizes: string };
}

const srcset = (im: ImageEntry, ws: number[], ext: string): string => ws.map((w) => `${im.base}-${w}.${ext} ${w}w`).join(', ');

export function picture(name: string, o: PictureOptions): string {
  const im = manifest[name];
  if (!im) return '';
  const pick = (ws: number[]): number[] => {
    const f = o.maxWidth ? ws.filter((w) => w <= o.maxWidth!) : ws;
    return f.length ? f : ws.slice(0, 1);
  };
  const avif = pick(im.avif);
  const fb = pick(im.fallback.widths);
  const cls = o.class ? ` class="${o.class}"` : '';
  const loading = o.eager
    ? `loading="eager"${o.normalPriority ? '' : ' fetchpriority="high"'} decoding="async"`
    : 'loading="lazy" decoding="async"';
  let artSources = '';
  if (o.art) {
    const alt = manifest[o.art.name];
    if (!alt) throw new Error(`recorte de imagem desconhecido: ${o.art.name}`);
    // width/height em cada <source>: o navegador reserva o espaço com a proporção do recorte escolhido.
    const dims = `sizes="${o.art.sizes}" width="${alt.width}" height="${alt.height}"`;
    artSources =
      `<source media="${o.art.media}" type="image/avif" srcset="${srcset(alt, alt.avif, 'avif')}" ${dims}>` +
      `<source media="${o.art.media}" srcset="${srcset(alt, alt.fallback.widths, alt.fallback.ext)}" ${dims}>`;
  }
  return (
    `<picture>${artSources}<source type="image/avif" srcset="${srcset(im, avif, 'avif')}" sizes="${o.sizes}" width="${im.width}" height="${im.height}">` +
    `<img${cls} src="${im.base}-${fb[fb.length - 1]}.${im.fallback.ext}" srcset="${srcset(im, fb, im.fallback.ext)}" sizes="${o.sizes}" ` +
    `alt="${esc(o.alt)}" width="${im.width}" height="${im.height}" ${loading}></picture>`
  );
}

/**
 * `<link rel="preload">` da imagem de LCP (mesmo srcset/sizes do <picture> para o navegador reaproveitar).
 * Com `media`, o preload só vale para a faixa de tela que realmente usa aquele recorte.
 */
export function preloadImage(name: string, sizes: string, media?: string): string {
  const im = manifest[name];
  if (!im) return '';
  return `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(im, im.avif, 'avif')}" imagesizes="${sizes}"${
    media ? ` media="${media}"` : ''
  } fetchpriority="high">`;
}

/* ----------------------------------------------------------------- ícones */

const WHATSAPP_PATH =
  'M16.04 4c-6.6 0-11.96 5.36-11.96 11.96 0 2.11.55 4.17 1.6 5.99L4 28l6.2-1.62a11.9 11.9 0 0 0 5.84 1.49h.01c6.6 0 11.96-5.36 11.96-11.96S22.64 4 16.04 4zm0 21.9h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.68.96.98-3.59-.24-.37a9.86 9.86 0 0 1-1.51-5.25c0-5.46 4.45-9.9 9.92-9.9 2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.47-4.45 9.9-9.91 9.9zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z';

const symbolCache = new Map<string, string>();

function symbol(name: string): string {
  const cached = symbolCache.get(name);
  if (cached) return cached;
  let out: string;
  if (name === 'whatsapp') {
    out = `<symbol id="i-whatsapp" viewBox="0 0 32 32"><path fill="currentColor" stroke="none" d="${WHATSAPP_PATH}"/></symbol>`;
  } else {
    const file = path.join(ROOT, 'node_modules/lucide-static/icons', `${name}.svg`);
    const svg = readFileSync(file, 'utf8');
    const inner = svg
      .slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'))
      .replace(/\s*\n\s*/g, '')
      .replace(/\s+\/>/g, '/>');
    out = `<symbol id="i-${name}" viewBox="0 0 24 24">${inner}</symbol>`;
  }
  symbolCache.set(name, out);
  return out;
}

/** Conjunto de ícones usados em uma página; vira um sprite SVG inline (um <symbol> por ícone). */
export class Icons {
  private used = new Set<string>();

  use(name: string, cls = ''): string {
    symbol(name); // falha cedo se o ícone não existir
    this.used.add(name);
    return `<svg class="icon${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  }

  sprite(): string {
    if (!this.used.size) return '';
    return `<svg class="sprite" aria-hidden="true" width="0" height="0">${[...this.used].sort().map(symbol).join('')}</svg>`;
  }
}

/* ------------------------------------------------- marcações do home.html */

export interface ExpandContext {
  icons: Icons;
  vars: Record<string, string>;
}

const attr = (tag: string, name: string): string | undefined => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const flag = (tag: string, name: string): boolean => new RegExp(`\\s${name}(\\s|>|=)`).test(tag);

/**
 * Expande as marcações de autoria usadas nos arquivos .html de `src/pages`:
 *   {{chave}}                    variável (já em HTML)
 *   {{wa}} / {{wa:Mensagem}}     link de WhatsApp com mensagem pré-preenchida
 *   {{split:Texto}}              palavra a palavra em <span> (animação do título)
 *   <x-icon name="check">        ícone do sprite
 *   <x-img name="…" alt="…" sizes="…" [class] [eager] [max="800"]>   <picture> responsivo
 *   <x-img … art="outro-recorte" art-media="(min-width: 62em)" art-sizes="…">   recorte alternativo por largura de tela
 */
export function expand(html: string, ctx: ExpandContext): string {
  return html
    .replace(/\{\{split:([^}]+)\}\}/g, (_, text: string) =>
      text
        .trim()
        .split(/\s+/)
        .map((w, i) => `<span class="w" style="--i:${i}"><span>${esc(w)}</span></span>`)
        .join(' '),
    )
    .replace(/\{\{wa(?::([^}]+))?\}\}/g, (_, msg?: string) => esc(whatsappUrl(msg?.trim() || undefined)))
    .replace(/\{\{([a-zA-Z][\w.]*)\}\}/g, (m, key: string) => {
      const v = ctx.vars[key];
      if (v === undefined) throw new Error(`variável de template desconhecida: ${m}`);
      return v;
    })
    .replace(/<x-icon\b[^>]*>/g, (tag) => {
      const name = attr(tag, 'name');
      if (!name) throw new Error(`<x-icon> sem name: ${tag}`);
      return ctx.icons.use(name, attr(tag, 'class') ?? '');
    })
    .replace(/<x-img\b[^>]*>/g, (tag) => {
      const name = attr(tag, 'name');
      if (!name || !image(name)) throw new Error(`<x-img> com imagem desconhecida: ${tag}`);
      const max = attr(tag, 'max');
      const art = attr(tag, 'art');
      return picture(name, {
        alt: attr(tag, 'alt') ?? '',
        sizes: attr(tag, 'sizes') ?? '100vw',
        class: attr(tag, 'class'),
        eager: flag(tag, 'eager'),
        ...(max ? { maxWidth: Number(max) } : {}),
        ...(art ? { art: { name: art, media: attr(tag, 'art-media') ?? '(min-width: 62em)', sizes: attr(tag, 'art-sizes') ?? '50vw' } } : {}),
      });
    });
}

/* ---------------------------------------------------------------- JSON-LD */

export function jsonLd(graph: object[]): string {
  if (!graph.length) return '';
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/* ------------------------------------------------------------------ datas */

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso));
