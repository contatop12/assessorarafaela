/**
 * Cloudflare Worker do site.
 *
 * O site é estático: HTML, CSS, JS, imagens e fontes são servidos direto pelos Static Assets
 * (pasta dist/), sem passar por este código. O Worker só roda em /api/* — hoje, o endpoint
 * que recebe o formulário de contato.
 *
 *   POST /api/lead   → valida o lead e encaminha para o webhook em LEAD_WEBHOOK_URL (se houver)
 */
import { BELOW_MINIMUM, formOptions } from '../content.ts';
import { site } from '../site.config.ts';

interface Lead {
  nome: string;
  /** Vazio quando o visitante não informou (campo opcional — ver site.leadForm.emailRequired). */
  email: string;
  whatsapp: string;
  /** Faixa disponível para investir (uma das opções de formOptions.valor). */
  valor: string;
  objetivo: string;
  /** Qualificação interna: a faixa informada atinge o mínimo de atendimento. Não vai para o analytics. */
  qualificado: boolean;
}

// As opções válidas são as mesmas exibidas no formulário (fonte única: src/content.ts).
const VALOR: readonly string[] = formOptions.valor;
const OBJETIVO: readonly string[] = formOptions.objetivo;
const MAX_BODY_BYTES = 8 * 1024;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
    },
  });

/** Texto limpo: sem espaços nas pontas, em NFC (acentos compostos) e com tamanho máximo. */
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.normalize('NFC').trim().slice(0, max) : '');

/** Lê o corpo com limite de tamanho (sem carregar payloads arbitrários na memória). */
async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

function parse(raw: string, contentType: string): Record<string, unknown> | null {
  try {
    if (contentType.includes('application/json')) {
      const data: unknown = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
    }
    return Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return null;
  }
}

/** `field` diz ao formulário em qual campo mostrar o erro. */
function validate(data: Record<string, unknown>): { lead: Lead } | { error: string; field: string } {
  const lead: Lead = {
    nome: text(data.nome, 120),
    email: text(data.email, 160).toLowerCase(),
    whatsapp: text(data.whatsapp, 20),
    valor: text(data.valor, 60),
    objetivo: text(data.objetivo, 60),
    qualificado: false,
  };
  if (!/\p{L}{2,}/u.test(lead.nome)) return { error: 'Informe o seu nome.', field: 'nome' };
  const digits = lead.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (digits.length !== 10 && digits.length !== 11) return { error: 'Informe o WhatsApp com DDD.', field: 'whatsapp' };
  if (!VALOR.includes(lead.valor)) return { error: 'Selecione quanto você tem disponível para investir.', field: 'valor' };
  if (!OBJETIVO.includes(lead.objetivo)) return { error: 'Selecione o seu objetivo principal.', field: 'objetivo' };
  const emailRequired: boolean = site.leadForm.emailRequired;
  if ((lead.email !== '' || emailRequired) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) {
    return { error: 'Informe um e-mail válido.', field: 'email' };
  }
  lead.whatsapp = `+55${digits}`;
  // Abaixo do mínimo o lead é capturado do mesmo jeito; o CRM decide o que fazer com ele.
  lead.qualificado = lead.valor !== BELOW_MINIMUM;
  return { lead };
}

function attribution(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
    const v = text((value as Record<string, unknown>)[key], 200);
    if (v) out[key] = v;
  }
  return out;
}

async function handleLead(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  // Sem JS o formulário faz um POST comum: responde com redirecionamento (página de confirmação ou de volta ao formulário).
  const reply = (body: { ok: boolean; forwarded?: boolean; error?: string; field?: string }, status: number): Response =>
    wantsJson ? json(body, status) : Response.redirect(`${url.origin}${body.ok ? '/obrigado/' : '/?erro=1#contato'}`, 303);

  // Só aceita envios feitos a partir do próprio site.
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ ok: false, error: 'Origem não permitida.' }, 403);

  const raw = await readBody(request);
  if (raw === null) return json({ ok: false, error: 'Requisição muito grande.' }, 413);
  const data = parse(raw, request.headers.get('content-type') ?? '');
  if (!data) return json({ ok: false, error: 'Formato inválido.' }, 400);

  // Armadilhas para robôs: campo invisível preenchido ou envio rápido demais. Responde "ok" e descarta.
  const elapsed = Number(data.elapsed ?? 0);
  if (text(data.empresa, 100) !== '' || (wantsJson && elapsed > 0 && elapsed < 1500)) {
    console.log(JSON.stringify({ message: 'lead descartado (spam)', reason: text(data.empresa, 1) ? 'honeypot' : 'rapido' }));
    return reply({ ok: true, forwarded: true }, 200);
  }

  const result = validate(data);
  if ('error' in result) return reply({ ok: false, error: result.error, field: result.field }, 422);

  const payload = {
    ...result.lead,
    origem: attribution(data.origem),
    pagina: text(data.pagina, 300) || url.origin,
    recebidoEm: new Date().toISOString(),
    pais: request.headers.get('cf-ipcountry') ?? '',
    site: url.hostname,
  };

  const webhook = env.LEAD_WEBHOOK_URL;
  if (!webhook) {
    // Sem webhook configurado o site avisa o visitante para concluir pelo WhatsApp.
    console.warn(JSON.stringify({ message: 'lead recebido sem LEAD_WEBHOOK_URL configurado' }));
    return reply({ ok: true, forwarded: false }, 200);
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.LEAD_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.LEAD_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webhook respondeu ${res.status}`);
    // Sem dados pessoais nem faixa patrimonial nos logs (LGPD): só o que ajuda a operar.
    console.log(JSON.stringify({ message: 'lead encaminhado', qualificado: payload.qualificado, objetivo: payload.objetivo }));
    return reply({ ok: true, forwarded: true }, 200);
  } catch (err) {
    console.error(JSON.stringify({ message: 'falha ao encaminhar lead', error: err instanceof Error ? err.message : String(err) }));
    return reply({ ok: true, forwarded: false }, 200);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Método não permitido.' }, 405);
      return handleLead(request, env);
    }
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Não encontrado.' }, 404);

    // Qualquer outra rota é arquivo estático (normalmente nem chega aqui).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
