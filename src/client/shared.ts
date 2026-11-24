/**
 * Comportamento compartilhado por todas as páginas: cabeçalho, menu mobile, CTA fixo de WhatsApp,
 * barra de progresso, cookies + Google Tag Manager, rastreio de cliques e prefetch.
 */

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)];

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/* ------------------------------------------------------- rolagem (um só rAF) */

type ScrollListener = (y: number, dy: number) => void;
const scrollListeners: ScrollListener[] = [];
let scrollQueued = false;
let lastY = window.scrollY;

function flushScroll(): void {
  scrollQueued = false;
  const y = window.scrollY;
  const dy = y - lastY;
  lastY = y;
  for (const fn of scrollListeners) fn(y, dy);
}

function queueScroll(): void {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(flushScroll);
}

/** Registra um callback chamado no máximo uma vez por frame enquanto a página rola ou redimensiona. */
export function onScroll(fn: ScrollListener): void {
  if (!scrollListeners.length) {
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll, { passive: true });
  }
  scrollListeners.push(fn);
  fn(window.scrollY, 0);
}

/** Observa a entrada/saída de elementos na viewport. */
export function watch(els: Element[], cb: (el: Element, visible: boolean) => void, options: IntersectionObserverInit = {}): void {
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) cb(e.target, e.isIntersecting);
  }, options);
  for (const el of els) io.observe(el);
}

/* ------------------------------------------------------------------ tracking */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Envia um evento ao dataLayer (GTM). Só entram dados de navegação — nunca nome, telefone,
 * e-mail ou faixa patrimonial. Se o visitante recusou os cookies, o GTM não processa nada.
 */
export function track(event: string, params: Record<string, unknown> = {}): void {
  (window.dataLayer ??= []).push({ event, ...params });
}

/* ---------------------------------------------------------- estado da interface */

const uiListeners: Array<() => void> = [];
/** Menu ou aviso de cookies abriu/fechou: quem depende disso (o CTA fixo) se atualiza. */
function uiChanged(): void {
  for (const fn of uiListeners) fn();
}

/* ------------------------------------------------------------ consentimento */

type Consent = 'granted' | 'denied';
const CONSENT_KEY = 'ra-consent';

function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* navegação privada: a escolha vale só para esta página */
  }
}

function gtag(..._args: unknown[]): void {
  // O GTM exige o objeto `arguments` (não um array) nos comandos de consentimento.
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
}

function consentState(value: Consent): Record<string, Consent> {
  return { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value };
}

let gtmLoaded = false;
function loadGtm(id: string): void {
  if (gtmLoaded) return;
  gtmLoaded = true;
  (window.dataLayer ??= []).push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}

/**
 * Carrega o GTM sem competir com o carregamento da página: na primeira interação do visitante
 * ou quando o navegador ficar ocioso depois do `load` — o que vier primeiro.
 */
function scheduleGtm(id: string): void {
  const start = (): void => {
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    const go = (): void => {
      for (const e of events) window.removeEventListener(e, go);
      loadGtm(id);
    };
    for (const e of events) window.addEventListener(e, go, { passive: true, once: true });
    const idle = (): void => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2500 });
      else setTimeout(go, 1800);
    };
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  };
  // Página pré-renderizada (Speculation Rules) só conta como visita quando o visitante chega nela.
  const doc = document as Document & { prerendering?: boolean };
  if (doc.prerendering) document.addEventListener('prerenderingchange', start, { once: true });
  else start();
}

function initConsent(): void {
  const root = document.documentElement;
  // Ambientes de teste (localhost, *.workers.dev) não enviam dados para o Analytics/Ads de produção.
  const isPreview = /^(localhost|127\.0\.0\.1|\[::1\])$|\.workers\.dev$/.test(location.hostname);
  const gtmId = isPreview ? '' : (root.dataset.gtm ?? '');
  const optIn = root.dataset.consent === 'opt-in';
  const banner = $('[data-cookie]');
  const stored = readConsent();

  if (gtmId) {
    const initial: Consent = stored ?? (optIn ? 'denied' : 'granted');
    gtag('consent', 'default', consentState(initial));
    if (initial === 'granted') scheduleGtm(gtmId);
  }

  if (!banner) return;
  const close = (value: Consent): void => {
    writeConsent(value);
    banner.hidden = true;
    uiChanged();
    if (!gtmId) return;
    gtag('consent', 'update', consentState(value));
    if (value === 'granted') loadGtm(gtmId);
  };
  $('[data-cookie-accept]', banner)?.addEventListener('click', () => close('granted'));
  $('[data-cookie-deny]', banner)?.addEventListener('click', () => close('denied'));
  for (const btn of $$('[data-cookie-open]')) {
    btn.addEventListener('click', () => {
      banner.hidden = false;
      uiChanged();
      $<HTMLButtonElement>('[data-cookie-accept]', banner)?.focus();
    });
  }
  if (!stored) banner.hidden = false;
}

/**
 * Cliques nos CTAs, sempre com a posição (`link_location`):
 *   whatsapp_click  → qualquer link do WhatsApp (hero, assessoria, flutuante, formulario…)
 *   form_cta_click  → links que levam ao formulário (ex.: "Prefiro deixar meu contato")
 * Toques repetidos no mesmo botão em menos de 1 s contam uma vez só.
 */
function initClickTracking(): void {
  let lastKey = '';
  let lastAt = 0;
  const once = (key: string): boolean => {
    const now = Date.now();
    if (key === lastKey && now - lastAt < 1000) return false;
    lastKey = key;
    lastAt = now;
    return true;
  };
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const wa = target?.closest<HTMLAnchorElement>('a[href^="https://wa.me"]');
    if (wa) {
      const where = wa.dataset.wa ?? 'outro';
      if (once(`wa:${where}`)) track('whatsapp_click', { link_location: where, page_path: location.pathname });
      return;
    }
    const toForm = target?.closest<HTMLAnchorElement>('a[data-cta-form]');
    if (toForm) {
      const where = toForm.dataset.ctaForm || 'outro';
      if (once(`form:${where}`)) track('form_cta_click', { link_location: where, page_path: location.pathname });
    }
  });
}

/* -------------------------------------------------------------------- header */

function initHeader(): void {
  const header = $('[data-header]');
  if (!header) return;
  const nav = $('[data-nav]');
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const label = toggle ? $('.sr-only', toggle) : null;
  const isOpen = (): boolean => nav?.classList.contains('is-open') ?? false;

  onScroll((y, dy) => {
    header.classList.toggle('is-stuck', y > 40);
    if (!isOpen()) {
      if (dy > 4 && y > 520) header.classList.add('is-hidden');
      else if (dy < -4 || y <= 520) header.classList.remove('is-hidden');
    }
  });

  if (!nav || !toggle) return;
  $$('li', nav).forEach((li, i) => li.style.setProperty('--i', String(i)));

  const setOpen = (open: boolean): void => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Fechar menu' : 'Abrir menu';
    document.documentElement.classList.toggle('has-menu-open', open);
    if (open) header.classList.remove('is-hidden');
    uiChanged();
  };
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  nav.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 62em)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });

  // Destaca no menu a seção que está na tela (só na home, onde as âncoras existem).
  const links = new Map<Element, HTMLAnchorElement>();
  for (const a of $$<HTMLAnchorElement>('.nav__list a[href^="/#"]', nav)) {
    const target = document.getElementById(a.hash.slice(1));
    if (target) links.set(target, a);
  }
  watch(
    [...links.keys()],
    (el, visible) => {
      if (!visible) return;
      for (const a of links.values()) a.classList.remove('is-active');
      links.get(el)?.classList.add('is-active');
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
}

/* --------------------------------------------------------- CTA fixo de WhatsApp */

/**
 * Um único botão fixo de WhatsApp. Aparece depois que o botão da primeira dobra sai da tela (nas
 * páginas sem ele, depois de rolar um pouco) e nunca junto de outro botão de WhatsApp do conteúdo —
 * assim há sempre um só CTA de WhatsApp à vista. Some também enquanto algo mais importante ocupa o
 * visitante: o formulário na tela, um campo em edição, o teclado aberto, o menu ou o aviso de cookies.
 */
function initStickyCta(): void {
  const cta = $('[data-sticky-cta]');
  if (!cta) return;
  const root = document.documentElement;
  const heroCta = $('[data-hero-cta]');
  const formArea = $('[data-lead-card]');
  const banner = $('[data-cookie]');
  // `ready`: só decide depois de saber quais botões do conteúdo estão na tela (evita piscar no carregamento).
  const state = { ready: false, scrolled: Boolean(heroCta), form: false, typing: false, keyboard: false };
  const inView = new Set<Element>();

  const sync = (): void => {
    const busy = state.form || state.typing || state.keyboard || root.classList.contains('has-menu-open') || (banner ? !banner.hidden : false);
    cta.classList.toggle('is-visible', state.ready && state.scrolled && inView.size === 0 && !busy);
  };
  uiListeners.push(sync);

  // Botões de WhatsApp do conteúdo (o da primeira dobra entre eles). A faixa do cabeçalho não conta
  // como área visível: sob ele, o botão já "saiu".
  const inline = $$('main a.btn[data-wa], main a.contact__wa');
  const headerH = $('[data-header]')?.offsetHeight ?? 0;
  watch(
    inline,
    (el, visible) => {
      if (visible) inView.add(el);
      else inView.delete(el);
      state.ready = true;
      sync();
    },
    { rootMargin: `-${headerH}px 0px 0px 0px` },
  );
  if (!inline.length) state.ready = true;
  if (!heroCta) {
    onScroll((y) => {
      const scrolled = y > 420;
      if (scrolled === state.scrolled) return;
      state.scrolled = scrolled;
      sync();
    });
  }
  if (formArea) {
    watch([formArea], (_, visible) => {
      state.form = visible;
      sync();
    });
  }

  const isField = (el: EventTarget | null): boolean =>
    el instanceof HTMLElement && el.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select');
  document.addEventListener('focusin', (e) => {
    if (!isField(e.target)) return;
    state.typing = true;
    sync();
  });
  document.addEventListener('focusout', (e) => {
    if (!isField(e.target)) return;
    state.typing = false;
    sync();
  });
  // Teclado virtual: a área visível encolhe bem mais que a janela.
  const vv = window.visualViewport;
  vv?.addEventListener('resize', () => {
    const keyboard = window.innerHeight - vv.height > 150;
    if (keyboard === state.keyboard) return;
    state.keyboard = keyboard;
    sync();
  });
  sync();
}

/* ------------------------------------------------------------------ progresso */

function initProgress(): void {
  const bar = $('[data-progress]');
  if (!bar) return;
  let max = 1;
  const measure = (): void => {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  measure();
  new ResizeObserver(measure).observe(document.body);
  onScroll((y) => bar.style.setProperty('--p', clamp(y / max, 0, 1).toFixed(4)));
}

/* -------------------------------------------------------------------- âncoras */

/** Âncoras do site antigo (anúncios e links externos ainda podem apontar para elas). */
const LEGACY_HASHES: Record<string, string> = {
  '#xp': '#eqi',
  '#contato2': '#contato',
  '#depoimentos': '#avaliacao',
  '#avaliacoes': '#avaliacao',
};

function initLegacyHashes(): void {
  const next = LEGACY_HASHES[location.hash];
  if (!next) return;
  history.replaceState(null, '', next);
  document.querySelector(next)?.scrollIntoView();
}

/* ------------------------------------------------------------------- prefetch */

/** Navegadores sem Speculation Rules (Safari, Firefox): prefetch do link ao passar o mouse/tocar. */
function initPrefetch(): void {
  if (HTMLScriptElement.supports?.('speculationrules')) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const done = new Set<string>();
  const prefetch = (e: Event): void => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
    if (!a || a.origin !== location.origin || a.target === '_blank' || a.pathname === location.pathname) return;
    if (a.pathname.startsWith('/api/') || done.has(a.pathname)) return;
    done.add(a.pathname);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = a.pathname;
    document.head.append(link);
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
}

export function initShared(): void {
  initConsent();
  initClickTracking();
  initHeader();
  initStickyCta();
  initProgress();
  initLegacyHashes();
  initPrefetch();
}
