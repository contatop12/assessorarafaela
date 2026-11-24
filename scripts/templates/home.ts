/** Fragmentos da home gerados a partir de src/content.ts (fonte única para HTML + schema.org). */
import { eqiRole, faqs, formOptions, stats, steps, testimonials } from '../../src/content.ts';
import { site } from '../../src/site.config.ts';
import { esc, picture, type Icons } from '../lib/html.ts';

const statItems = (): string =>
  stats.map((s) => `<div class="track__item"><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join('\n');

const stepItems = (): string =>
  steps
    .map(
      (s) => `<li class="step">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
    </li>`,
    )
    .join('\n');

const careerItems = (): string =>
  site.person.career
    .map((name, i, all) =>
      i === all.length - 1 ? `<li class="is-current"><span>${esc(name)}</span><em>atual</em></li>` : `<li><span>${esc(name)}</span></li>`,
    )
    .join('');

/** "Ancord, CEA e CPA-20" */
const credentialNames = (): string => new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(site.person.credentials.map((c) => c.name));

/** Selos oficiais: só depois de confirmada a situação das certificações (site.person.credentialsConfirmed). */
function credentialBadges(): string {
  if (!site.person.credentialsConfirmed) return '';
  return `<ul class="badges" aria-label="Selos das certificações">
        <li>${picture('selo-anbima-cpa-20', { alt: 'Selo ANBIMA Profissional CPA-20', sizes: '76px' })}</li>
        <li>${picture('selo-anbima-cea', { alt: 'Selo ANBIMA Profissional CEA', sizes: '76px' })}</li>
        <li><img src="/img/ancord.svg" alt="Ancord — Certificação e Credenciamento" width="187" height="60" loading="lazy" decoding="async"></li>
      </ul>`;
}

const eqiItems = (): string => eqiRole.map((r) => `<div><dt>${esc(r.title)}</dt><dd>${esc(r.text)}</dd></div>`).join('\n');

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

/** "R$ 300 mil" não quebra entre linhas dentro do botão de opção. */
const nowrapMoney = (text: string): string =>
  esc(text).replace(/R\$ (\d+) (mil|milhão|milhões)/g, (_, n: string, unit: string) => `R$&nbsp;${n}&nbsp;${unit}`);

const radios = (name: string, options: readonly string[]): string =>
  options
    .map(
      (opt, i) =>
        `<label class="pill"><input type="radio" name="${name}" value="${esc(opt)}"${i === 0 ? ' required' : ''}><span>${nowrapMoney(opt)}</span></label>`,
    )
    .join('');

function emailField(): string {
  const required = site.leadForm.emailRequired;
  return `<div class="field" data-field="email"${required ? '' : ' data-optional'}>
          <label for="f-email">E-mail${required ? '' : ' <span class="field__opt">(opcional)</span>'}</label>
          <input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" maxlength="160" aria-describedby="e-email"${required ? ' required' : ''}>
          <p class="field__error" id="e-email" hidden>${required ? 'Informe um e-mail válido.' : 'Confira o e-mail informado ou deixe o campo em branco.'}</p>
        </div>`;
}

export function homeVars(icons: Icons, homePosts: string): Record<string, string> {
  return {
    name: esc(site.person.name),
    tagline: esc(site.person.tagline),
    minimum: nowrapMoney(site.minimum),
    stats: statItems(),
    steps: stepItems(),
    career: careerItems(),
    credentialNames: esc(credentialNames()),
    credentialBadges: credentialBadges(),
    eqiRole: eqiItems(),
    testimonials: quoteItems(icons),
    faq: faqItems(icons),
    formValor: radios('valor', formOptions.valor),
    formObjetivo: radios('objetivo', formOptions.objetivo),
    formEmail: emailField(),
    waDisplay: site.whatsapp.display,
    homePosts,
  };
}
