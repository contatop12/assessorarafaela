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
    /** Linha profissional exibida junto ao nome (primeira dobra, rodapé, artigos). */
    tagline: 'Assessora de investimentos vinculada à EQI',
    employer: { name: 'EQI Investimentos', url: 'https://eqi.com.br/' },
    /** Empresas da trajetória profissional, em ordem cronológica (a última é a atual). */
    career: ['Santander Select', 'XP Investimentos', 'EQI Investimentos'],
    credentials: [
      { name: 'Ancord', issuer: 'Ancord — Associação Nacional das Corretoras e Distribuidoras de Títulos e Valores Mobiliários' },
      { name: 'CEA', issuer: 'ANBIMA' },
      { name: 'CPA-20', issuer: 'ANBIMA' },
    ],
    /**
     * Situação das certificações conferida com a Rafaela (vigência e nomenclatura atual na ANBIMA/Ancord)?
     *  - false: as certificações aparecem só como texto; os selos oficiais e o `hasCredential` do schema.org ficam fora.
     *  - true: os selos voltam à seção "Sobre" e as credenciais entram nos dados estruturados.
     */
    credentialsConfirmed: false,
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

  /** Critério de atendimento exibido junto aos CTAs. */
  minimum: 'Para quem tem a partir de R$ 300 mil para investir.',

  leadForm: {
    /**
     * E-mail obrigatório no formulário? `false` deixa o campo opcional (o lead segue para o webhook com
     * `email: ""`). Volte para `true` se o fluxo do CRM exigir e-mail.
     */
    emailRequired: false,
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
