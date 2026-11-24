/**
 * Conteúdo estruturado da home. É a fonte única para o HTML visível, para o schema.org
 * (FAQPage etc.), para o llms.txt e para a validação do formulário no Worker — editar aqui
 * mantém tudo idêntico.
 *
 * Regra editorial: só entram afirmações comprováveis. Nada de promessa ou insinuação de
 * rentabilidade, nem termos que sugiram gestão de recursos, consultoria ou custódia.
 */

/* ------------------------------------------------------------ trajetória em números */

export interface Stat {
  value: string;
  /** Contexto histórico: fica sempre visível junto do número. */
  label: string;
}

/**
 * Os dois números refletem o histórico de carreira — não custódia nem base ativa atual.
 * Origem, período e forma de cálculo aguardam validação da Rafaela; se o volume refletir um pico
 * ou o trabalho de uma equipe, ajuste a legenda para a atribuição comprovável.
 */
export const stats: Stat[] = [
  { value: 'Mais de R$ 500 milhões', label: 'Em patrimônio acompanhado ao longo da carreira' },
  { value: 'Mais de 500 clientes', label: 'Atendidos ao longo da carreira' },
];

/* --------------------------------------------------------- como funciona a assessoria */

export interface Step {
  title: string;
  text: string;
}

/** As três etapas do atendimento. Revisar se o texto divergir do atendimento real. */
export const steps: Step[] = [
  {
    title: 'Entender sua carteira',
    text: 'Conversamos sobre o que você já tem investido, seus objetivos e a liquidez de que precisa.',
  },
  {
    title: 'Avaliar alternativas',
    text: 'Discutimos riscos, custos e como as alternativas disponíveis se encaixam na sua estratégia.',
  },
  {
    title: 'Acompanhar suas decisões',
    text: 'Revemos o que mudou na carteira e nos seus objetivos para avaliar ajustes ao longo do tempo.',
  },
];

/* ------------------------------------------------------------------------------ EQI */

/** Vínculo institucional e papel da assessora — sem menção a tarifas, custódia ou produtos específicos. */
export const eqiRole: Step[] = [
  {
    title: 'A EQI Investimentos',
    text: 'É a instituição à qual sou vinculada e pela qual você investe. É nela que a sua conta é aberta.',
  },
  {
    title: 'O meu papel',
    text: 'Apresentar e explicar os produtos e serviços disponíveis, tirar as suas dúvidas e acompanhar a sua carteira com você.',
  },
  {
    title: 'As decisões',
    text: 'São sempre suas: eu trago as informações e você decide.',
  },
];

/* ---------------------------------------------------------------------- depoimentos */

export interface Testimonial {
  name: string;
  /**
   * Trecho exibido. Frases com relato de ganho ou rentabilidade ficam de fora (depoimento não é
   * argumento de rentabilidade esperada); o corte é sempre em frase inteira e marcado com […].
   */
  text: string;
}

/** Ordem: primeiro os que descrevem atendimento, clareza e acompanhamento. */
export const testimonials: Testimonial[] = [
  {
    name: 'Fernando',
    text: 'O que mais me impressionou no atendimento da Rafaela foi a clareza. Eu já passei por grandes bancos onde me sentia apenas mais um número, mas com ela a relação é outra. Ela conseguiu organizar meu patrimônio de uma forma que eu não via antes, sempre trazendo oportunidades que realmente fazem sentido para o meu momento de vida.',
  },
  {
    name: 'Fábio',
    text: 'Seu atendimento exclusivo e a atenção aos detalhes me deixam tranquilo para focar na minha empresa e ter plena confiança de que o meu patrimônio e o da minha família estão sendo bem cuidados.',
  },
  {
    name: 'André',
    text: 'Ela não espera eu ligar. Ela antecipa os movimentos do mercado e me traz soluções estratégicas, tanto no Brasil quanto no exterior. Tem sido uma assessoria muito eficaz e estou muito satisfeito com a nossa parceria até aqui.',
  },
  {
    name: 'Helena',
    text: 'Eu sempre tive receio de investir em produtos mais complexos por não entender nada do “economês”. A Rafaela tem um dom raro de traduzir o mercado financeiro de um jeito simples, sem ser superficial. […]',
  },
  {
    name: 'Adriane',
    text: 'Rafaela é uma pessoa de muita empatia, qualidade que acho fundamental para alguém que cuida dos meus investimentos. Desde o início, ela demonstrou um grande entendimento das minhas metas de longo prazo e trabalhou incansavelmente para que eu as atingisse. […]',
  },
  {
    name: 'Miriam',
    text: 'Trabalhar com a Rafaela foi uma revolução na minha vida financeira. […] Ela não só entende as complexidades do mercado, como também tem a habilidade de traduzi-las para um vocabulário simples e comum.',
  },
];

/* ------------------------------------------------------------------------------ FAQ */

export interface Faq {
  q: string;
  /** Texto puro (sem HTML): é o que vai para o JSON-LD e para o llms.txt. */
  a: string;
}

/**
 * Só condições confirmadas. As respostas sobre a primeira conversa e sobre a remuneração dependem
 * do modelo comercial e das políticas da EQI: estão marcadas para revisão antes da publicação.
 */
export const faqs: Faq[] = [
  {
    q: 'Para quem é a assessoria?',
    a: 'Para quem tem a partir de R$ 300 mil para investir e quer acompanhamento próximo da carteira. Atendo pessoas físicas e empresas.',
  },
  {
    q: 'Como funciona a primeira conversa?',
    a: 'Você me chama no WhatsApp ou deixa o seu contato no formulário desta página. Na primeira conversa, falamos sobre o que você já tem investido, seus objetivos e a liquidez de que precisa.',
  },
  {
    q: 'Já invisto em outra instituição. Posso conversar com a Rafaela?',
    a: 'Pode. A conversa começa pela carteira que você já tem, onde quer que ela esteja: seus objetivos, seus prazos e a liquidez de que precisa. Depois disso, você decide se e como quer seguir.',
  },
  {
    q: 'Como funciona a remuneração da assessoria?',
    a: 'Não há cobrança à parte pela assessoria para quem tem a partir de R$ 300 mil para investir. Os custos variam conforme o produto, e eu explico cada um deles antes de qualquer decisão.',
  },
  {
    q: 'A Rafaela atende em quais regiões?',
    a: 'Atendo investidores em todo o Brasil. O primeiro contato é feito pelo WhatsApp ou pelo formulário desta página.',
  },
];

/* ----------------------------------------------------------------------- formulário */

/**
 * Opções do formulário de contato. Os textos são os valores enviados ao webhook (`valor` e
 * `objetivo`): ao mudar aqui, ajuste também os mapeamentos do CRM.
 */
export const formOptions = {
  valor: ['Abaixo de R$ 300 mil', 'De R$ 300 mil a menos de R$ 500 mil', 'De R$ 500 mil a menos de R$ 1 milhão', 'R$ 1 milhão ou mais'],
  objetivo: ['Revisar minha carteira', 'Investir no exterior', 'Planejar a aposentadoria', 'Preservar meu patrimônio', 'Outro objetivo'],
} as const;

/** Faixa abaixo do mínimo de atendimento: o lead é capturado do mesmo jeito, só não é marcado como qualificado. */
export const BELOW_MINIMUM: string = formOptions.valor[0];

/* ----------------------------------------------------------------------- blog na home */

export interface HomePost {
  /** Slug do artigo em content/posts (a URL não muda). */
  slug: string;
  /** Tema exibido no card — a categoria herdada do WordPress nem sempre corresponde ao artigo. */
  topic: string;
  /** Chamada revisada: descreve o conteúdo, sem insinuar ganho. */
  teaser: string;
}

/** Artigos em destaque na home, com tema e chamada revisados. Para trocar, edite esta lista. */
export const homePosts: HomePost[] = [
  {
    slug: 'como-minimizar-riscos-ao-investir-em-fiis-2',
    topic: 'Fundos imobiliários (FII)',
    teaser: 'Os principais riscos dos fundos imobiliários e como a diversificação e a análise de cada fundo ajudam a lidar com eles.',
  },
  {
    slug: 'diferenca-entre-fundos-de-investimento-e-etfs-na-renda-fixa',
    topic: 'Fundos de investimento',
    teaser: 'O que muda entre fundos de investimento e ETFs de renda fixa em liquidez, tributação e forma de investir.',
  },
  {
    slug: 'impacto-das-politicas-monetarias-globais-economia-mercados',
    topic: 'Economia e mercados',
    teaser: 'Como as decisões dos bancos centrais influenciam juros, inflação e os mercados de investimento.',
  },
];
