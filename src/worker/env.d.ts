/**
 * Segredos opcionais do Worker (definidos com `wrangler secret put`, fora do wrangler.jsonc).
 * Os bindings declarados no wrangler.jsonc vêm de worker-configuration.d.ts (`npm run cf-typegen`).
 */
interface Env {
  /** URL que recebe os leads do formulário em JSON (n8n, Make, Zapier, CRM…). */
  LEAD_WEBHOOK_URL?: string;
  /** Opcional: enviado como `Authorization: Bearer <token>` para o webhook. */
  LEAD_WEBHOOK_TOKEN?: string;
}
