/**
 * Configuração central do site. Tudo que é dado de negócio (contato, URLs, tags) mora aqui —
 * altere uma vez e o build propaga para HTML, schema.org, sitemap, robots e llms.txt.
 */
export const site = {
  /** URL canônica de produção (sem barra no final). */
  url: 'https://assessorarafaela.com.br',
  name: 'Rafaela Alves — Assessora de Investimentos',
  shortName: 'Rafaela Alves',
  locale: 'pt-BR',
  themeColor: '#06231b',

  person: {
    name: 'Rafaela Alves',
    jobTitle: 'Assessora de Investimentos',
    employer: { name: 'EQI Investimentos', url: 'https://eqi.com.br/' },
    credentials: [
      { name: 'Ancord', issuer: 'Ancord — Associação Nacional das Corretoras e Distribuidoras de Títulos e Valores Mobiliários' },
      { name: 'CEA', issuer: 'ANBIMA' },
      { name: 'CPA-20', issuer: 'ANBIMA' },
    ],
    /** Perfis públicos verificáveis (LinkedIn, Instagram…). Entram em `sameAs` no schema.org. */
    sameAs: [] as string[],
  },

  whatsapp: {
    /** Somente dígitos, com DDI. */
    number: '5511988595724',
    display: '(11) 98859-5724',
    tel: '+5511988595724',
    defaultMessage: 'Olá, Rafaela! Vim pelo site e gostaria de conversar sobre os meus investimentos.',
  },

  /** Conta na EQI (link do rodapé do site original). */
  openAccountUrl: 'https://eqi.com.br/',

  /** Google Tag Manager do site original. Deixe vazio para desligar todo o rastreamento. */
  gtmId: 'GTM-KQ7WPWS6',

  /**
   * Cookies/rastreamento:
   *  - 'opt-out' (igual ao site original): o GTM carrega por padrão e para se o visitante recusar.
   *  - 'opt-in': o GTM só carrega depois que o visitante clicar em "Aceitar".
   */
  consentMode: 'opt-out' as 'opt-out' | 'opt-in',

  developer: { name: 'P12 Digital', url: 'https://p12digital.com.br/' },

  blog: { perPage: 12 },
} as const;

export function whatsappUrl(message: string = site.whatsapp.defaultMessage): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
