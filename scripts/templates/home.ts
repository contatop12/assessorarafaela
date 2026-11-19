/** Fragmentos da home gerados a partir de src/content.ts (fonte única para HTML + schema.org). */
import { eqi, faqs, formOptions, included, offers, reasons, stats, testimonials } from '../../src/content.ts';
import { site } from '../../src/site.config.ts';
import { esc, type Icons } from '../lib/html.ts';

const fmt = new Intl.NumberFormat('pt-BR');

/** Roseta estilo guilhoché (como em cédulas e certificados): elipses giradas a partir de um mesmo centro. */
function rosette(): string {
  const ring = (count: number, step: number, href: string, offset = 0): string =>
    Array.from({ length: count }, (_, i) => `<use href="#${href}" style="--i:${i + offset}" transform="rotate(${(i * step).toFixed(2)})"/>`).join('');
  return `<svg class="rosette" viewBox="-300 -300 600 600" focusable="false">
  <defs>
    <ellipse id="rs-a" rx="286" ry="104" pathLength="1"/>
    <ellipse id="rs-b" rx="206" ry="46" pathLength="1"/>
  </defs>
  <g class="rosette__spin">
    <g class="rosette__outer">${ring(18, 10, 'rs-a')}</g>
    <g class="rosette__inner">${ring(12, 15, 'rs-b', 6)}</g>
    <circle class="rosette__rim" r="294"/>
    <circle class="rosette__rim rosette__rim--dotted" r="300"/>
  </g>
</svg>`;
}

function statItems(): string {
  return stats
    .map(
      (s, i) => `<li class="stat" data-reveal style="--d:${i * 90}ms">
      <p class="stat__value"><span data-count="${s.value}" data-prefix="${esc(s.prefix)}" data-suffix="${esc(s.suffix)}">${esc(s.prefix)}${fmt.format(s.value)}${esc(s.suffix)}</span></p>
      <p class="stat__label">${esc(s.label)}</p>
    </li>`,
    )
    .join('\n');
}

function reasonTabs(icons: Icons): { tabs: string; panels: string } {
  const tabs = reasons
    .map(
      (r, i) => `<button class="tabs__tab" type="button" role="tab" id="motivo-tab-${i}" aria-controls="motivo-${i}" aria-selected="${i === 0}"${i === 0 ? '' : ' tabindex="-1"'}>
        <span class="tabs__icon">${icons.use(r.icon)}</span>
        <span class="tabs__label">${esc(r.title)}</span>
        <span class="tabs__timer" aria-hidden="true"><i></i></span>
      </button>`,
    )
    .join('\n');
  const panels = reasons
    .map(
      (r, i) => `<div class="tabs__panel${i === 0 ? ' is-active' : ''}" role="tabpanel" id="motivo-${i}" aria-labelledby="motivo-tab-${i}" tabindex="0">
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.text)}</p>
      </div>`,
    )
    .join('\n');
  return { tabs, panels };
}

const offerCards = (icons: Icons): string =>
  offers
    .map(
      (o, i) => `<li class="offer" data-reveal data-spot style="--d:${i * 80}ms">
      <span class="offer__icon">${icons.use(o.icon)}</span>
      <h3>${esc(o.title)}</h3>
      <p>${esc(o.text)}</p>
    </li>`,
    )
    .join('\n');

const includedItems = (icons: Icons): string => included.map((f) => `<li>${icons.use(f.icon)}${esc(f.title)}</li>`).join('');

const eqiCards = (icons: Icons): string =>
  eqi
    .map(
      (c, i) => `<li class="stack__card" style="--n:${i}">
      <span class="stack__icon">${icons.use(c.icon)}</span>
      <div>
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.text)}</p>
      </div>
    </li>`,
    )
    .join('\n');

const quoteItems = (icons: Icons): string =>
  testimonials
    .map(
      (t) => `<li class="quote">
      ${icons.use('quote', 'quote__mark')}
      <blockquote><p>${esc(t.text)}</p></blockquote>
      <p class="quote__who"><span class="quote__avatar" aria-hidden="true">${esc(t.name.charAt(0))}</span><strong>${esc(t.name)}</strong><span>Cliente da assessoria</span></p>
    </li>`,
    )
    .join('\n');

const faqItems = (icons: Icons): string =>
  faqs
    .map(
      (f, i) => `<details class="faq__item" name="faq"${i === 0 ? ' open' : ''}>
      <summary><h3>${esc(f.q)}</h3>${icons.use('plus')}</summary>
      <div class="faq__answer"><p>${esc(f.a)}</p></div>
    </details>`,
    )
    .join('\n');

const radios = (name: string, options: readonly string[]): string =>
  options
    .map(
      (opt, i) =>
        `<label class="pill"><input type="radio" name="${name}" value="${esc(opt)}"${i === 0 ? ' required' : ''}><span>${esc(opt)}</span></label>`,
    )
    .join('');

const repeat = (html: string, times: number): string => Array.from({ length: times }, () => html).join('');

export function homeVars(icons: Icons, latestPosts: string): Record<string, string> {
  const { tabs, panels } = reasonTabs(icons);
  const sep = '<i aria-hidden="true"></i>';
  return {
    rosette: rosette(),
    stats: statItems(),
    reasonsTabs: tabs,
    reasonsPanels: panels,
    offers: offerCards(icons),
    included: includedItems(icons),
    eqiCards: eqiCards(icons),
    testimonials: quoteItems(icons),
    faq: faqItems(icons),
    formValor: radios('valor', formOptions.valor),
    formObjetivo: radios('objetivo', formOptions.objetivo),
    waDisplay: site.whatsapp.display,
    latestPosts,
    // Duas cópias do mesmo grupo: a animação desloca exatamente um grupo e recomeça (loop sem emenda).
    bandValues: repeat(`<span class="band__group">${repeat(`<span>Determinação</span>${sep}<span>Persistência</span>${sep}<span>Garra</span>${sep}<span>Força</span>${sep}`, 2)}</span>`, 2),
    bandLove: repeat(`<span class="band__group">${repeat(`<span>Amor pelo meu trabalho</span>${sep}`, 4)}</span>`, 2),
  };
}
