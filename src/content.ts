/**
 * Conteúdo estruturado da home. É a fonte única para o HTML visível E para o schema.org
 * (FAQPage etc.) — editar aqui mantém os dois sempre idênticos.
 *
 * Todos os textos vêm do site original; nada de dado de negócio inventado.
 */

export interface Faq {
  q: string;
  /** Texto puro (sem HTML): é o que vai para o JSON-LD e para o llms.txt. */
  a: string;
}

export const faqs: Faq[] = [
  {
    q: 'O que é necessário para abrir uma conta na EQI?',
    a: 'Basta entrar em contato diretamente comigo ou com algum membro da minha equipe pelo WhatsApp para iniciar o processo de abertura de conta. Estaremos prontos para orientá-lo em cada etapa.',
  },
  {
    q: 'Quais os benefícios de ter a Rafaela como assessora?',
    a: 'Ter a Rafaela como assessora é garantir uma gestão patrimonial de elite, fundamentada por uma trajetória de sucesso com mais de R$ 500 milhões gerenciados e o reconhecimento de diversas premiações de destaque no setor. Com o respaldo técnico das certificações CEA, Ancord e CPA-20, ela une a solidez da EQI Investimentos à proatividade de uma especialista que antecipa os movimentos do mercado para oferecer soluções exclusivas, tanto no Brasil quanto no exterior. Sua atuação transforma a complexidade financeira em uma estratégia clara e personalizada, sendo a parceira ideal para investidores de alta renda que buscam segurança, acesso a oportunidades globais e um atendimento que valoriza objetivos de vida acima de simples números.',
  },
  {
    q: 'Como funciona essa assessoria?',
    a: 'A assessoria funciona de maneira personalizada, com atendimento dedicado e estratégias específicas para o seu perfil e as suas metas.',
  },
  {
    q: 'O atendimento é voltado somente a pessoas físicas ou também atende empresas?',
    a: 'Atendo tanto pessoa física quanto empresas. Minha abordagem personalizada estende-se a uma gama diversificada de clientes, adaptando estratégias de investimento às necessidades específicas de cada perfil, seja individual ou empresarial. Estou aqui para oferecer uma assessoria especializada e estratégica, independentemente do contexto, visando sempre o sucesso financeiro dos meus clientes.',
  },
  {
    q: 'Quanto custa a assessoria de investimentos?',
    a: 'A assessoria é gratuita para clientes com investimentos a partir de R$ 300.000,00. Além disso, a EQI oferece taxa zero para abertura e manutenção de conta, custódia de renda fixa, Tesouro Direto e fundos imobiliários.',
  },
  {
    q: 'A Rafaela atende investidores de quais regiões?',
    a: 'Atendo investidores em todo o Brasil, com soluções para o mercado local e internacional.',
  },
  {
    q: 'Quais certificações a Rafaela Alves possui?',
    a: 'Detenho as principais certificações do mercado — Ancord, CEA e CPA-20 — e mantenho um compromisso constante com atualizações técnicas.',
  },
  {
    q: 'Por que investir pela EQI Investimentos?',
    a: 'A EQI é uma das maiores casas de assessoria do Brasil e tem o BTG Pactual — o maior banco de investimentos da América Latina — como parceiro estratégico e custodiante. Isso une a segurança institucional de um grande banco à exclusividade e à agilidade de uma assessoria premiada.',
  },
];

export interface Testimonial {
  name: string;
  text: string;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Miriam',
    text: 'Trabalhar com a Rafaela foi uma revolução na minha vida financeira. Seu profundo conhecimento do mercado de alta renda me proporcionou retornos que superaram as minhas expectativas. Ela não só entende as complexidades do mercado, como também tem a habilidade de traduzi-las para um vocabulário simples e comum.',
  },
  {
    name: 'André',
    text: 'Ela não espera eu ligar. Ela antecipa os movimentos do mercado e me traz soluções estratégicas, tanto no Brasil quanto no exterior. Tem sido uma assessoria muito eficaz e estou muito satisfeito com a nossa parceria até aqui.',
  },
  {
    name: 'Helena',
    text: 'Eu sempre tive receio de investir em produtos mais complexos por não entender nada do “economês”. A Rafaela tem um dom raro de traduzir o mercado financeiro de um jeito simples, sem ser superficial. Ela respeita muito o meu perfil conservador e estou muito feliz com a rentabilidade atual.',
  },
  {
    name: 'Fábio',
    text: 'Seu atendimento exclusivo e a atenção aos detalhes me deixam tranquilo para focar na minha empresa e ter plena confiança de que o meu patrimônio e o da minha família estão sendo bem cuidados.',
  },
  {
    name: 'Adriane',
    text: 'Rafaela é uma pessoa de muita empatia, qualidade que acho fundamental para alguém que cuida dos meus investimentos. Desde o início, ela demonstrou um grande entendimento das minhas metas de longo prazo e trabalhou incansavelmente para que eu as atingisse. Estou muito feliz com a minha evolução patrimonial.',
  },
  {
    name: 'Fernando',
    text: 'O que mais me impressionou no atendimento da Rafaela foi a clareza. Eu já passei por grandes bancos onde me sentia apenas mais um número, mas com ela a relação é outra. Ela conseguiu organizar meu patrimônio de uma forma que eu não via antes, sempre trazendo oportunidades que realmente fazem sentido para o meu momento de vida.',
  },
];

export interface Stat {
  /** Valor final da contagem animada. */
  value: number;
  prefix: string;
  suffix: string;
  label: string;
}

export const stats: Stat[] = [
  { value: 500, prefix: '+R$ ', suffix: ' mi', label: 'Gerenciados sob minha custódia' },
  { value: 300, prefix: '+', suffix: '', label: 'Clientes satisfeitos' },
  { value: 10, prefix: '+', suffix: '', label: 'Certificações e atualizações' },
  { value: 10, prefix: '+', suffix: '', label: 'Prêmios na área' },
];

export interface Reason {
  icon: string;
  title: string;
  text: string;
}

/** “Por que escolher minha Assessoria de Investimentos?” */
export const reasons: Reason[] = [
  {
    icon: 'user-check',
    title: 'Atendimento personalizado',
    text: 'Sua jornada de investimentos merece atenção única. Com uma carteira mais enxuta, garanto que cada recomendação é feita pensando exclusivamente no seu perfil e nas suas metas.',
  },
  {
    icon: 'trending-up',
    title: 'Resultados comprovados',
    text: 'Minha carteira de clientes reflete o sucesso das estratégias que implemento. Não se trata apenas de números, mas de vidas transformadas por meio de investimentos inteligentes.',
  },
  {
    icon: 'lock-open',
    title: 'Liberdade e dedicação exclusiva',
    text: 'Ao contrário dos grandes bancos, onde as metas muitas vezes sobrepujam a qualidade do atendimento, ofereço a liberdade necessária para focar nas melhores recomendações, com uma carteira mais reduzida.',
  },
  {
    icon: 'award',
    title: 'Certificações e reconhecimentos',
    text: 'Detenho as certificações Ancord, CEA e CPA-20, além de constantes atualizações técnicas que fundamentam minha expertise no mercado financeiro. Minha trajetória é marcada por uma entrega de excelência, tendo sido premiada diversas vezes como Profissional Destaque ao longo da minha carreira.',
  },
];

/** “O que ofereço no meu serviço” */
export const offers: Reason[] = [
  {
    icon: 'target',
    title: 'Estratégias sob medida',
    text: 'Desenvolvo estratégias de investimento personalizadas para garantir que suas metas se tornem realidade.',
  },
  {
    icon: 'gem',
    title: 'Acesso a oportunidades exclusivas',
    text: 'Como meu cliente de alta renda, você terá acesso privilegiado a oportunidades de investimento exclusivas.',
  },
  {
    icon: 'file-chart-column',
    title: 'Relatórios transparentes',
    text: 'Mantenha-se sempre informado sobre o desempenho dos seus investimentos com relatórios claros e detalhados.',
  },
  {
    icon: 'messages-square',
    title: 'Aconselhamento contínuo',
    text: 'Estou aqui para ajudar em cada etapa do caminho, fornecendo aconselhamento contínuo para garantir que seus investimentos estejam alinhados com seus objetivos.',
  },
];

/** Recursos listados (só título) na apresentação do site original. */
export const included: Array<{ icon: string; title: string }> = [
  { icon: 'package', title: 'Variedade de produtos' },
  { icon: 'user-check', title: 'Assessoria personalizada' },
  { icon: 'monitor-smartphone', title: 'Plataforma de investimento online' },
  { icon: 'search', title: 'Acesso a pesquisas e análises' },
  { icon: 'megaphone', title: 'Eventos e treinamentos' },
  { icon: 'users', title: 'Acompanhamento contínuo' },
];

/** “Por que investir com a EQI Investimentos?” — diferenciais e vantagens. */
export const eqi: Reason[] = [
  {
    icon: 'wallet',
    title: 'Custo zero e eficiência',
    text: 'Seguindo o compromisso com a rentabilidade do cliente, a EQI oferece taxa zero para abertura e manutenção de conta, custódia de renda fixa, Tesouro Direto e fundos imobiliários, além de isenção em tarifas de TED para retiradas.',
  },
  {
    icon: 'layers',
    title: 'O maior portfólio do mercado',
    text: 'Ao investir pela EQI, você tem acesso à plataforma do BTG Pactual, o que significa a maior prateleira de produtos financeiros do país. Isso inclui fundos exclusivos, emissões bancárias com taxas diferenciadas e acesso direto ao mercado internacional.',
  },
  {
    icon: 'chart-line',
    title: 'Inteligência própria e relatórios exclusivos',
    text: 'Diferente de outras corretoras, a EQI possui uma casa de análise própria (EQI Research). Isso garante que você receba recomendações baseadas em estudos profundos e independentes, e não apenas em opções genéricas de prateleira.',
  },
  {
    icon: 'handshake',
    title: 'Atendimento personalizado: o DNA EQI',
    text: 'Enquanto outras instituições estão automatizando o atendimento, a EQI foca no relacionamento humano. Você conta com um especialista dedicado para entender seus objetivos de vida, garantindo que a estratégia de investimentos seja tão única quanto o seu perfil.',
  },
  {
    icon: 'globe',
    title: 'Ecossistema completo',
    text: 'Além dos investimentos, a EQI oferece soluções em câmbio, seguros, planejamento sucessório e crédito, permitindo que toda a sua vida financeira seja gerida em um só lugar, com visão 360º.',
  },
];

/** Opções do formulário de contato (iguais às do site original). */
export const formOptions = {
  valor: ['Acima de 1 milhão', 'Entre R$501.000 e R$999.999', 'Entre R$300.000 e R$500.000', 'Abaixo de R$300.000'],
  objetivo: ['Melhorar meus investimentos', 'Ter uma aposentadoria confortável', 'Proteção financeira'],
} as const;
