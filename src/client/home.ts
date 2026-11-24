/** Interações da página inicial: "ver mais depoimentos" e formulário de contato. */
import { $, $$, initShared, track } from './shared.ts';

initShared();

/* ---------------------------------------------------------------- depoimentos */

/** No celular a lista começa com dois depoimentos; o botão mostra os demais e leva o foco até eles. */
function initQuotes(): void {
  const list = $('[data-quotes]');
  const more = $<HTMLButtonElement>('[data-quotes-more]');
  if (!list || !more) return;
  more.addEventListener('click', () => {
    const firstRevealed = list.children[2] as HTMLElement | undefined;
    list.classList.add('is-expanded');
    more.setAttribute('aria-expanded', 'true');
    more.hidden = true;
    if (firstRevealed) {
      firstRevealed.tabIndex = -1;
      firstRevealed.focus({ preventScroll: true });
    }
  });
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

interface LeadResponse {
  ok?: boolean;
  forwarded?: boolean;
  error?: string;
  /** Campo que o servidor recusou (para mostrar o erro no lugar certo). */
  field?: string;
}

function initLeadForm(): void {
  const form = $<HTMLFormElement>('[data-lead-form]');
  const success = $('[data-lead-success]');
  if (!form || !success) return;
  const status = $('.form__status', form);
  const submit = $<HTMLButtonElement>('[type="submit"]', form);
  const submitLabel = submit ? $('[data-submit-label]', submit) : null;
  const idleLabel = submitLabel?.textContent ?? '';
  const phone = form.elements.namedItem('whatsapp') as HTMLInputElement;
  const emailOptional = $('[data-field="email"]', form)?.hasAttribute('data-optional') ?? false;
  const origem = attribution();
  let startedAt = 0;
  let sending = false;
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
  const emailOk = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const rules: Record<string, () => boolean> = {
    nome: () => /\p{L}{2,}/u.test(value('nome')),
    whatsapp: () => [10, 11].includes(value('whatsapp').replace(/\D/g, '').length),
    valor: () => value('valor') !== '',
    objetivo: () => value('objetivo') !== '',
    email: () => (emailOptional && value('email') === '') || emailOk(value('email')),
  };
  const mark = (name: string, ok: boolean, message?: string): void => {
    const field = $(`[data-field="${name}"]`, form);
    if (!field) return;
    field.classList.toggle('is-invalid', !ok);
    const msg = $('.field__error', field);
    if (msg) {
      if (message) msg.textContent = message;
      msg.hidden = ok;
    }
    for (const input of $$<HTMLInputElement>('input', field)) input.setAttribute('aria-invalid', String(!ok));
  };
  const check = (name: string): boolean => {
    const ok = rules[name]?.() ?? true;
    mark(name, ok);
    return ok;
  };
  const focusField = (name: string): void => $<HTMLInputElement>(`[data-field="${name}"] input`, form)?.focus();
  // Depois do primeiro erro, corrige a mensagem conforme a pessoa digita.
  for (const name of Object.keys(rules)) {
    const field = $(`[data-field="${name}"]`, form);
    field?.addEventListener('input', () => field.classList.contains('is-invalid') && check(name));
    field?.addEventListener('change', () => field.classList.contains('is-invalid') && check(name));
  }

  const setSending = (on: boolean): void => {
    sending = on;
    if (on) submit?.setAttribute('aria-busy', 'true');
    else submit?.removeAttribute('aria-busy');
    if (submitLabel) submitLabel.textContent = on ? 'Enviando…' : idleLabel;
  };

  /** `sent`: o backend confirmou o recebimento. Nos outros casos o visitante conclui pelo WhatsApp. */
  const showSuccess = (mode: 'sent' | 'whatsapp' | 'error'): void => {
    const title = $('h3', success);
    const text = $('[data-lead-success-text]', success);
    const link = $<HTMLAnchorElement>('[data-lead-success-link]', success);
    const first = value('nome').split(/\s+/)[0] ?? '';
    if (mode === 'sent') {
      if (title && first) title.textContent = `Recebemos o seu contato, ${first}`;
    } else {
      if (title) title.textContent = mode === 'error' ? 'Não foi possível enviar pelo site' : 'Falta só um passo';
      if (text) text.textContent = 'Toque no botão abaixo para enviar os seus dados pelo WhatsApp. A mensagem já vai preenchida.';
      if (link) {
        // Só neste caso os dados seguem na mensagem: é o que garante que o contato não se perde.
        const message = [
          'Olá, Rafaela! Preenchi o formulário do site.',
          '',
          `Nome: ${value('nome')}`,
          `WhatsApp: ${value('whatsapp')}`,
          `Disponível para investir: ${value('valor')}`,
          `Objetivo: ${value('objetivo')}`,
          ...(value('email') ? [`E-mail: ${value('email')}`] : []),
        ].join('\n');
        const url = new URL(link.href);
        url.searchParams.set('text', message);
        link.href = url.href;
      }
    }
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const invalid = Object.keys(rules).filter((name) => !check(name));
    if (invalid.length) {
      if (status) status.textContent = invalid.length > 1 ? 'Revise os campos destacados para enviar.' : 'Revise o campo destacado para enviar.';
      focusField(invalid[0] as string);
      return;
    }
    if (status) status.textContent = '';
    setSending(true);
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
      const data = (await res.json().catch(() => ({}))) as LeadResponse;
      if (res.status === 422 && data.error) {
        // O servidor recusou um campo: mostra o erro no próprio campo e mantém o formulário aberto.
        if (data.field && rules[data.field]) {
          mark(data.field, false, data.error);
          focusField(data.field);
        }
        if (status) status.textContent = data.error;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(`status ${res.status}`);
      // Envio confirmado pelo backend — um evento por lead, sem dados pessoais nem faixa patrimonial.
      track('generate_lead', { form_name: 'contato', objetivo: payload.objetivo, lead_forwarded: Boolean(data.forwarded) });
      showSuccess(data.forwarded ? 'sent' : 'whatsapp');
    } catch {
      track('form_error', { form_name: 'contato' });
      showSuccess('error');
    } finally {
      setSending(false);
    }
  });
}

initQuotes();
initLeadForm();
