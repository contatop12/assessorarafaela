/**
 * Otimização de imagens → AVIF (principal) + WebP/JPEG (fallback), em larguras responsivas.
 *
 *   npm run images
 *
 * Entradas:
 *   assets-src/home/*      imagens da home (versionadas)
 *   .cache/wp/blog/*       imagens do blog importadas do WordPress (não versionadas)
 * Saídas (versionadas, o build só copia):
 *   public/img/**          arquivos otimizados
 *   content/images.json    manifesto com dimensões e variantes (usado para gerar <picture>)
 *
 * É incremental: só reprocessa o que ainda não existe em public/img.
 */
import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimize as svgo } from 'svgo';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_HOME = path.join(ROOT, 'assets-src/home');
const SRC_BLOG = path.join(ROOT, '.cache/wp/blog');
const OUT = path.join(ROOT, 'public/img');
const MANIFEST = path.join(ROOT, 'content/images.json');

export interface ImageEntry {
  /** Caminho público sem sufixo de largura/extensão, ex.: `/img/blog/2025-08-foo`. */
  base: string;
  width: number;
  height: number;
  avif: number[];
  fallback: { ext: 'webp' | 'jpg' | 'png'; widths: number[] };
}
type Manifest = Record<string, ImageEntry>;

interface Job {
  name: string;
  src: string;
  dir: string;
  widths: number[];
  fallback: 'webp' | 'jpg';
  fallbackWidths?: number[];
  avifQuality?: number;
  /** Recorte opcional antes do redimensionamento. */
  extract?: { left: number; top: number; width: number; height: number };
}

const HOME: Job[] = [
  { name: 'rafaela-alves-assessora-de-investimentos', src: 'IMG_8916.webp', dir: '', widths: [420, 640, 832], fallback: 'webp', avifQuality: 58 },
  { name: 'rafaela-alves-eqi-investimentos', src: 'IMG_3491.webp', dir: '', widths: [420, 640, 832], fallback: 'webp', avifQuality: 58 },
  { name: 'rafaela-alves-evento-mercado-financeiro', src: 'Camada-0-1-2.png', dir: '', widths: [280, 440, 640], fallback: 'webp', avifQuality: 55 },
  { name: 'logo-rafaela-alves-assessora-de-investimento-eqi', src: 'LOGO-RA-ASSESSORA-DE-INVESTIMENTO-EQI.png', dir: '', widths: [280, 560, 840], fallback: 'webp', avifQuality: 70 },
  { name: 'selo-anbima-cpa-20', src: 'certificado.png', dir: '', widths: [120, 241], fallback: 'webp', avifQuality: 70 },
  { name: 'selo-anbima-cea', src: 'certificado2.png', dir: '', widths: [120, 225], fallback: 'webp', avifQuality: 70 },
];

const exists = (p: string): Promise<boolean> => access(p).then(() => true, () => false);

async function processJob(job: Job, manifest: Manifest): Promise<void> {
  const outDir = path.join(OUT, job.dir);
  await mkdir(outDir, { recursive: true });
  const input = job.extract ? sharp(job.src).extract(job.extract) : sharp(job.src);
  const meta = await sharp(job.extract ? await input.toBuffer() : job.src).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error(`sem dimensões: ${job.src}`);

  const clamp = (list: number[]): number[] => {
    const out = [...new Set(list.map((w) => Math.min(w, srcW)))].sort((a, b) => a - b);
    return out;
  };
  const widths = clamp(job.widths);
  const fallbackWidths = clamp(job.fallbackWidths ?? [widths[widths.length - 1] as number]);
  const base = path.join(outDir, job.name);

  for (const w of widths) {
    const file = `${base}-${w}.avif`;
    if (await exists(file)) continue;
    await sharp(job.src, { failOn: 'none' })
      .extract(job.extract ?? { left: 0, top: 0, width: srcW, height: srcH })
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: job.avifQuality ?? 50, effort: 6, chromaSubsampling: '4:2:0' })
      .toFile(file);
  }
  for (const w of fallbackWidths) {
    const file = `${base}-${w}.${job.fallback}`;
    if (await exists(file)) continue;
    const pipeline = sharp(job.src, { failOn: 'none' })
      .extract(job.extract ?? { left: 0, top: 0, width: srcW, height: srcH })
      .resize({ width: w, withoutEnlargement: true });
    if (job.fallback === 'webp') await pipeline.webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(file);
    else await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 76, mozjpeg: true }).toFile(file);
  }

  manifest[job.name] = {
    base: `/img/${job.dir ? `${job.dir}/` : ''}${job.name}`,
    width: srcW,
    height: srcH,
    avif: widths,
    fallback: { ext: job.fallback, widths: fallbackWidths },
  };
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) await fn(items[i++] as T);
    }),
  );
}

/** Um .ico válido pode embutir um PNG: 6 bytes de cabeçalho + 16 de diretório + o PNG. */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

async function favicons(): Promise<void> {
  const src = path.join(SRC_HOME, 'favicon-512.png');
  const pub = path.join(ROOT, 'public');
  // Monograma sobre fundo transparente; nos ícones "de app" ele ganha fundo sólido da marca.
  const transparent = (size: number): Promise<Buffer> =>
    sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
  const solid = async (size: number, pad: number): Promise<Buffer> => {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(src).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: '#06231b' } })
      .composite([{ input: mark, gravity: 'centre' }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  };
  await writeFile(path.join(pub, 'favicon.ico'), pngToIco(await solid(48, 0.1), 48));
  await writeFile(path.join(pub, 'favicon-32.png'), await transparent(32));
  await writeFile(path.join(pub, 'icon-192.png'), await solid(192, 0.14));
  await writeFile(path.join(pub, 'icon-512.png'), await solid(512, 0.14));
  await writeFile(path.join(pub, 'apple-touch-icon.png'), await solid(180, 0.14));
}

async function main(): Promise<void> {
  sharp.concurrency(1);
  const manifest: Manifest = (await exists(MANIFEST)) ? (JSON.parse(await readFile(MANIFEST, 'utf8')) as Manifest) : {};

  const jobs: Job[] = HOME.map((j) => ({ ...j, src: path.join(SRC_HOME, j.src) }));

  if (await exists(SRC_BLOG)) {
    const featured = new Set<string>();
    const postsDir = path.join(ROOT, 'content/posts');
    for (const f of await readdir(postsDir)) {
      const m = (await readFile(path.join(postsDir, f), 'utf8')).match(/"image": "([^"]*)"/);
      if (m?.[1]) featured.add(m[1]);
    }
    for (const file of await readdir(SRC_BLOG)) {
      const name = file.replace(/\.[a-z0-9]+$/i, '');
      const isFeatured = featured.has(name);
      jobs.push({
        name,
        src: path.join(SRC_BLOG, file),
        dir: 'blog',
        // Capa: card (480) → corpo do post (800) → telas 2x e og:image (1200). Imagem interna: até 800.
        widths: isFeatured ? [480, 800, 1200] : [480, 800],
        fallback: 'jpg',
        fallbackWidths: isFeatured ? [1200] : [800],
        avifQuality: 48,
      });
    }
  } else {
    console.log('(.cache/wp/blog ausente — mantendo as imagens do blog já otimizadas)');
  }

  let done = 0;
  await pool(jobs, Math.max(2, os.cpus().length - 1), async (job) => {
    try {
      await processJob(job, manifest);
    } catch (err) {
      console.warn(`  ! ${job.name}: ${(err as Error).message}`);
    }
    if (++done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
  });

  // SVG: remove metadados e reduz a precisão dos caminhos (o original exportado tem casas decimais de sobra).
  const ancord = svgo(await readFile(path.join(SRC_HOME, 'ANCORD.svg'), 'utf8'), { multipass: true, floatPrecision: 1 });
  await writeFile(path.join(OUT, 'ancord.svg'), ancord.data);
  await favicons();

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`ok — ${Object.keys(sorted).length} imagens no manifesto`);
}

await main();
