/**
 * Fontes self-hosted, recortadas para o português (subset) e em WOFF2.
 *
 *   npm run fonts
 *
 * Lê os arquivos dos pacotes @fontsource (devDependencies), mantém só os glifos usados em
 * pt-BR e grava em public/fonts (versionado — o build só copia). Também imprime as métricas
 * usadas nos `@font-face` de fallback em src/styles/base.css (evita layout shift na troca).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/fonts');

// Latim básico + Latin-1 (acentos do português) + pontuação tipográfica usada no site.
const range = (from: number, to: number): string =>
  Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)).join('');
const TEXT = `${range(0x20, 0x7e)}${range(0xa0, 0xff)}–—‘’“”…•€™→←↑↓✓×`;

interface FontJob {
  out: string;
  src: string;
  /** Fonte de sistema usada como fallback (define as métricas impressas para o `@font-face` de fallback). */
  fallback: 'Georgia' | 'Arial';
  axes?: Record<string, { min: number; max: number } | number>;
}

const JOBS: FontJob[] = [
  // Títulos: Playfair Display (variável, 400–700). Substituiu a Bodoni Moda, cujos traços finos
  // ficavam apagados nos títulos médios (cards, perguntas, etapas).
  {
    out: 'playfair-display.woff2',
    src: '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2',
    fallback: 'Georgia',
    axes: { wght: { min: 400, max: 700 } },
  },
  { out: 'poppins-400.woff2', src: '@fontsource/poppins/files/poppins-latin-400-normal.woff2', fallback: 'Arial' },
  { out: 'poppins-500.woff2', src: '@fontsource/poppins/files/poppins-latin-500-normal.woff2', fallback: 'Arial' },
  { out: 'poppins-600.woff2', src: '@fontsource/poppins/files/poppins-latin-600-normal.woff2', fallback: 'Arial' },
];

/** Largura média ponderada pela frequência de letras — mesma ideia do `size-adjust` do fontaine/capsize. */
function metrics(buf: Buffer): { unitsPerEm: number; ascent: number; descent: number; lineGap: number; avg: number } {
  const font = fontkit.create(buf) as fontkit.Font;
  const sample = 'aaaaaaaaeeeeeeeeeeeeooooooosssssssrrrrrriiiiiinnnnnndddddmmmmuuuutttccllppvghqbfzjxkwy               ';
  let total = 0;
  for (const ch of sample) total += font.glyphForCodePoint(ch.codePointAt(0) as number).advanceWidth;
  return {
    unitsPerEm: font.unitsPerEm,
    ascent: font.ascent,
    descent: font.descent,
    lineGap: font.lineGap,
    avg: total / sample.length / font.unitsPerEm,
  };
}

// Larguras médias (mesma amostra) das fontes de sistema usadas como fallback.
const FALLBACK_AVG = { Arial: 0.4656, Georgia: 0.4594 } as const;

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  for (const job of JOBS) {
    const input = await readFile(path.join(ROOT, 'node_modules', job.src));
    const output = await subsetFont(input, TEXT, {
      targetFormat: 'woff2',
      ...(job.axes ? { variationAxes: job.axes } : {}),
    });
    await writeFile(path.join(OUT, job.out), output);
    const m = metrics(output);
    const fallback = job.fallback;
    const sizeAdjust = m.avg / FALLBACK_AVG[fallback];
    const pct = (n: number): string => `${(n * 100).toFixed(2)}%`;
    console.log(
      `${job.out.padEnd(20)} ${(input.length / 1024).toFixed(1)}KB → ${(output.length / 1024).toFixed(1)}KB | ` +
        `fallback ${fallback}: size-adjust ${pct(sizeAdjust)}; ascent-override ${pct(m.ascent / m.unitsPerEm / sizeAdjust)}; ` +
        `descent-override ${pct(Math.abs(m.descent) / m.unitsPerEm / sizeAdjust)}; line-gap-override ${pct(m.lineGap / m.unitsPerEm / sizeAdjust)}`,
    );
  }
}

await main();
