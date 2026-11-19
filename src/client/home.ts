/** Interações da página inicial: parallax, faixa animada, contadores, abas, carrossel e formulário. */
import { $, $$, clamp, finePointer, initShared, onScroll, reduceMotion, track, watch } from './shared.ts';

initShared();

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ------------------------------------------------------ parallax do ponteiro */

function initPointerParallax(): void {
  if (!finePointer || reduceMotion) return;
  for (const root of $$('[data-pointer]')) {
    for (const el of $$('[data-depth]', root)) el.style.setProperty('--depth', el.dataset.depth ?? '0');
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const tick = (): void => {
      x = lerp(x, tx, 0.08);
      y = lerp(y, ty, 0.08);
      root.style.setProperty('--px', x.toFixed(4));
      root.style.setProperty('--py', y.toFixed(4));
      raf = Math.abs(x - tx) + Math.abs(y - ty) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent): void => {
      const r = root.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) / window.innerWidth, -0.5, 0.5) * -2;
      ty = clamp((e.clientY - (r.top + r.height / 2)) / window.innerHeight, -0.5, 0.5) * -2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // Reage ao ponteiro em toda a seção, não só sobre a foto.
    (root.closest('section') ?? root).addEventListener('pointermove', move as EventListener, { passive: true });
  }
}

/* ------------------------------------------------------- parallax da rolagem */

function initScrollParallax(): void {
  if (reduceMotion) return;
  const items: Array<{ el: HTMLElement; factor: number; visible: boolean }> = [
    ...$$('[data-parallax]').map((el) => ({ el, factor: Number(el.dataset.parallax), visible: false })),
    ...$$('.about__photo img').map((el) => ({ el, factor: -0.06, visible: false })),
    ...$$('.hero__portrait').map((el) => ({ el, factor: 0.05, visible: false })),
  ];
  const rosette = $('.rosette');
  const update = (y: number): void => {
    const mid = window.innerHeight / 2;
    for (const item of items) {
      if (!item.visible) continue;
      const r = item.el.getBoundingClientRect();
      const current = Number.parseFloat(item.el.style.getPropertyValue('--sy')) || 0;
      // Posição "natural" do elemento (sem o deslocamento que nós mesmos aplicamos).
      const offset = r.top - current + r.height / 2 - mid;
      item.el.style.setProperty('--sy', `${(offset * item.factor).toFixed(1)}px`);
    }
    if (rosette && y < window.innerHeight * 1.5) rosette.style.setProperty('--spin', (y * 0.05).toFixed(2));
  };
  watch(
    items.map((i) => i.el),
    (el, visible) => {
      const item = items.find((i) => i.el === el);
      if (item) item.visible = visible;
      if (visible) update(window.scrollY);
    },
    { rootMargin: '20% 0px' },
  );
  onScroll(update);
}

/* --------------------------------------------- pausa animações fora da tela */

function initHeroPause(): void {
  const hero = $('[data-hero]');
  if (!hero) return;
  watch([hero], (_, visible) => {
    for (const el of $$('.rosette__spin, .chip', hero)) el.style.animationPlayState = visible ? '' : 'paused';
  });
}

/* --------------------------------------------- faixa que acelera com a rolagem */

function initMarquee(): void {
  if (reduceMotion) return;
  const rows = $$('[data-marquee]').flatMap((row) => {
    const trackEl = $('.band__track', row);
    const group = $('.band__group', row);
    return trackEl && group ? [{ trackEl, group, dir: Number(row.dataset.marquee) || -1, x: 0, width: 0 }] : [];
  });
  if (!rows.length) return;
  const band = rows[0]?.trackEl.closest('section');
  if (!band) return;

  const measure = (): void => {
    for (const r of rows) r.width = r.group.getBoundingClientRect().width;
  };
  measure();
  new ResizeObserver(measure).observe(band);
  document.fonts?.ready.then(measure);

  let velocity = 0;
  let flow = 1; // sentido atual: acompanha a direção da rolagem
  onScroll((_, dy) => {
    velocity = clamp(velocity + dy * 0.35, -60, 60);
    if (Math.abs(dy) > 1) flow = dy > 0 ? 1 : -1;
  });

  let running = false;
  let last = 0;
  const frame = (now: number): void => {
    if (!running) return;
    const dt = Math.min(48, now - last) / 16.67;
    last = now;
    velocity *= 0.92;
    for (const r of rows) {
      if (!r.width) continue;
      const speed = (0.9 + Math.abs(velocity) * 0.35) * flow * r.dir;
      r.x = (((r.x + speed * dt) % r.width) + r.width) % r.width;
      r.trackEl.style.transform = `translate3d(${(-r.x).toFixed(2)}px,0,0)`;
    }
    requestAnimationFrame(frame);
  };
  for (const r of rows) r.trackEl.classList.add('is-driven');
  watch(
    [band],
    (_, visible) => {
      if (visible && !running) {
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      } else if (!visible) running = false;
    },
    { rootMargin: '10% 0px' },
  );
}

/* ----------------------------------------------------------------- contadores */

function initCounters(): void {
  const els = $$('[data-count]');
  if (reduceMotion || !els.length) return;
  const fmt = new Intl.NumberFormat('pt-BR');
  const run = (el: HTMLElement): void => {
    const end = Number(el.dataset.count);
    const prefix = el.dataset.prefix ?? '';
    const suffix = el.dataset.suffix ?? '';
    const duration = 1700;
    const start = performance.now();
    const step = (now: number): void => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - 2 ** (-10 * t);
      el.textContent = `${prefix}${fmt.format(Math.round(end * (t === 1 ? 1 : eased)))}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        run(e.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  for (const el of els) io.observe(el);
}

/* ----------------------------------------------------------------------- abas */

function initTabs(): void {
  for (const root of $$('[data-tabs]')) {
    const tabs = $$<HTMLButtonElement>('[role="tab"]', root);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') ?? ''));
    let auto = !reduceMotion;

    const select = (index: number, focus = false): void => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        tab.classList.toggle('is-running', active && auto);
        panels[i]?.classList.toggle('is-active', active);
      });
      if (focus) tabs[index]?.focus();
    };
    const stopAuto = (): void => {
      auto = false;
      for (const t of tabs) t.classList.remove('is-running');
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        stopAuto();
        select(i);
      });
      tab.addEventListener('keydown', (e) => {
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        const target = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : delta ? (i + delta + tabs.length) % tabs.length : -1;
        if (target < 0) return;
        e.preventDefault();
        stopAuto();
        select(target, true);
      });
      // O avanço automático é a própria barra do botão: quando a animação termina, vai para a próxima aba.
      $('.tabs__timer i', tab)?.addEventListener('animationend', () => {
        if (auto) select((i + 1) % tabs.length);
      });
    });

    // Só corre o tempo com as abas na tela e sem o visitante lendo/interagindo.
    let inView = false;
    let engaged = false;
    const sync = (): void => {
      root.classList.toggle('is-paused', !inView || engaged);
    };
    root.addEventListener('pointerenter', () => ((engaged = true), sync()));
    root.addEventListener('pointerleave', () => ((engaged = false), sync()));
    root.addEventListener('focusin', () => ((engaged = true), sync()));
    root.addEventListener('focusout', () => ((engaged = false), sync()));
    watch([root], (_, visible) => ((inView = visible), sync()), { threshold: 0.35 });
    sync();
    select(0);
  }
}

/* ------------------------------------------------------------------ carrossel */

function initCarousels(): void {
  for (const root of $$('[data-carousel]')) {
    const trackEl = $('.carousel__track', root);
    if (!trackEl) continue;
    const nav = $(`[data-carousel-nav="${root.dataset.carousel}"]`);
    const prev = nav ? $<HTMLButtonElement>('[data-prev]', nav) : null;
    const next = nav ? $<HTMLButtonElement>('[data-next]', nav) : null;
    const bar = $('[data-carousel-progress]', root);

    const step = (): number => {
      const first = trackEl.firstElementChild as HTMLElement | null;
      return first ? first.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(trackEl).columnGap || '0') : 300;
    };
    const update = (): void => {
      const max = trackEl.scrollWidth - trackEl.clientWidth;
      if (prev) prev.disabled = trackEl.scrollLeft <= 2;
      if (next) next.disabled = trackEl.scrollLeft >= max - 2;
      bar?.style.setProperty('--p', clamp((trackEl.scrollLeft + trackEl.clientWidth) / trackEl.scrollWidth, 0, 1).toFixed(4));
    };
    prev?.addEventListener('click', () => trackEl.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => trackEl.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    trackEl.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    new ResizeObserver(update).observe(trackEl);
    update();

    // Arrastar com o mouse (no toque a rolagem nativa já resolve).
    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;
    trackEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = trackEl.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        trackEl.classList.add('is-dragging');
      }
      if (moved) trackEl.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      trackEl.classList.remove('is-dragging');
    });
    trackEl.addEventListener('click', (e) => moved && e.preventDefault(), true);
  }
}

/* ------------------------------------------------- brilho e botões magnéticos */

function initPointerEffects(): void {
  if (!finePointer) return;
  for (const el of $$('[data-spot]')) {
    el.addEventListener(
      'pointermove',
      (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      },
      { passive: true },
    );
  }
  if (reduceMotion) return;
  for (const el of $$('[data-magnetic]')) {
    el.addEventListener(
      'pointermove',
      (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      },
      { passive: true },
    );
    el.addEventListener('pointerleave', () => (el.style.translate = ''));
  }
}

/* ------------------------------------------------- cards empilhados (EQI) */

function initStack(): void {
  const stack = $('[data-stack]');
  if (!stack || reduceMotion) return;
  const cards = $$('.stack__card', stack);
  let visible = false;
  const update = (): void => {
    if (!visible) return;
    const rects = cards.map((c) => c.getBoundingClientRect());
    cards.forEach((card, i) => {
      const next = rects[i + 1];
      const own = rects[i];
      if (!next || !own || getComputedStyle(card).position !== 'sticky') {
        card.style.setProperty('--s', '1');
        card.style.setProperty('--dim', '0');
        return;
      }
      // 0 → o próximo card ainda está abaixo; 1 → já cobriu este.
      const covered = clamp(1 - (next.top - own.top - 14) / own.height, 0, 1);
      card.style.setProperty('--s', (1 - covered * 0.045).toFixed(4));
      card.style.setProperty('--dim', (covered * 0.07).toFixed(3));
    });
  };
  watch(
    [stack],
    (_, v) => {
      visible = v;
      update();
    },
    { rootMargin: '10% 0px' },
  );
  onScroll(update);
}

/* ----------------------------------------------------------------- formulário */

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;
const ATTRIBUTION_STORE = 'ra-origem';

/** Guarda a origem da visita (UTMs/gclid) durante a sessão para enviar junto com o lead. */
function attribution(): Record<string, string> {
  const fromUrl: Record<string, string> = {};
  const params = new URLSearchParams(location.search);
  for (const k of ATTRIBUTION_KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v.slice(0, 200);
  }
  try {
    if (Object.keys(fromUrl).length) sessionStorage.setItem(ATTRIBUTION_STORE, JSON.stringify(fromUrl));
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_STORE) ?? '{}') as Record<string, string>;
  } catch {
    return fromUrl;
  }
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function initLeadForm(): void {
  const form = $<HTMLFormElement>('[data-lead-form]');
  const success = $('[data-lead-success]');
  if (!form || !success) return;
  const status = $('.form__status', form);
  const submit = $<HTMLButtonElement>('[type="submit"]', form);
  const phone = form.elements.namedItem('whatsapp') as HTMLInputElement;
  const origem = attribution();
  let startedAt = 0;
  // Com JS a validação é nossa (mensagens em português junto de cada campo); sem JS vale a nativa do navegador.
  form.noValidate = true;

  phone.addEventListener('input', () => {
    phone.value = maskPhone(phone.value);
  });
  form.addEventListener(
    'focusin',
    () => {
      startedAt = Date.now();
      track('form_start', { form_name: 'contato' });
    },
    { once: true },
  );
  form.addEventListener('change', () => (startedAt ||= Date.now()), { once: true });

  const value = (name: string): string => String(new FormData(form).get(name) ?? '').trim();
  const rules: Record<string, () => boolean> = {
    valor: () => value('valor') !== '',
    objetivo: () => value('objetivo') !== '',
    nome: () => /\p{L}{2,}/u.test(value('nome')),
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value('email')),
    whatsapp: () => [10, 11].includes(value('whatsapp').replace(/\D/g, '').length),
  };
  const check = (name: string): boolean => {
    const ok = rules[name]?.() ?? true;
    const field = $(`[data-field="${name}"]`, form);
    if (field) {
      field.classList.toggle('is-invalid', !ok);
      const msg = $('.field__error', field);
      if (msg) msg.hidden = ok;
      for (const input of $$<HTMLInputElement>('input', field)) input.setAttribute('aria-invalid', String(!ok));
    }
    return ok;
  };
  // Depois do primeiro erro, corrige a mensagem conforme a pessoa digita.
  for (const name of Object.keys(rules)) {
    const field = $(`[data-field="${name}"]`, form);
    field?.addEventListener('input', () => field.classList.contains('is-invalid') && check(name));
    field?.addEventListener('change', () => field.classList.contains('is-invalid') && check(name));
  }

  const showSuccess = (mode: 'sent' | 'whatsapp' | 'error'): void => {
    const title = $('h3', success);
    const text = $('[data-lead-success-text]', success);
    const link = $<HTMLAnchorElement>('[data-lead-success-link]', success);
    const first = value('nome').split(/\s+/)[0] ?? '';
    if (title && text) {
      if (mode === 'sent') {
        title.textContent = first ? `Recebi os seus dados, ${first}` : 'Recebi os seus dados';
      } else {
        title.textContent = mode === 'error' ? 'Não consegui enviar pelo site' : 'Falta só um passo';
        text.textContent = 'Toque no botão abaixo para me enviar os seus dados pelo WhatsApp — a mensagem já vai preenchida.';
      }
    }
    if (link) {
      const message = [
        'Olá, Rafaela! Acabei de preencher o formulário do site.',
        '',
        `Nome: ${value('nome')}`,
        `E-mail: ${value('email')}`,
        `WhatsApp: ${value('whatsapp')}`,
        `Valor acumulado: ${value('valor')}`,
        `Objetivo: ${value('objetivo')}`,
      ].join('\n');
      const url = new URL(link.href);
      url.searchParams.set('text', message);
      link.href = url.href;
    }
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = Object.keys(rules).filter((name) => !check(name));
    if (invalid.length) {
      if (status) status.textContent = 'Revise os campos destacados para enviar.';
      $<HTMLInputElement>(`[data-field="${invalid[0]}"] input`, form)?.focus();
      return;
    }
    if (status) status.textContent = '';
    submit?.setAttribute('aria-busy', 'true');
    const payload = {
      nome: value('nome'),
      email: value('email'),
      whatsapp: value('whatsapp'),
      valor: value('valor'),
      objetivo: value('objetivo'),
      empresa: value('empresa'),
      elapsed: startedAt ? Date.now() - startedAt : 0,
      pagina: location.href,
      origem,
    };
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; forwarded?: boolean; error?: string };
      if (res.status === 422 && data.error) {
        if (status) status.textContent = data.error;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(`status ${res.status}`);
      track('generate_lead', { form_name: 'contato', valor_acumulado: payload.valor, objetivo: payload.objetivo, lead_forwarded: Boolean(data.forwarded) });
      showSuccess(data.forwarded ? 'sent' : 'whatsapp');
    } catch {
      track('form_error', { form_name: 'contato' });
      showSuccess('error');
    } finally {
      submit?.removeAttribute('aria-busy');
    }
  });
}

initPointerParallax();
initScrollParallax();
initHeroPause();
initMarquee();
initCounters();
initTabs();
initCarousels();
initPointerEffects();
initStack();
initLeadForm();
