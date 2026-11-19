/** Dados estruturados (schema.org / JSON-LD). Tudo aqui espelha conteúdo visível nas páginas. */
import { faqs } from '../../src/content.ts';
import { site, whatsappUrl } from '../../src/site.config.ts';
import { abs, image } from './html.ts';
import type { Category, Post } from '../templates/blog.ts';

const ID = {
  website: `${site.url}/#website`,
  person: `${site.url}/#rafaela-alves`,
  service: `${site.url}/#assessoria`,
  employer: `${site.url}/#eqi-investimentos`,
};

const PORTRAIT = 'rafaela-alves-assessora-de-investimentos';

function imageObject(name: string, caption: string): object | undefined {
  const im = image(name);
  if (!im) return undefined;
  const w = im.fallback.widths[im.fallback.widths.length - 1] as number;
  return {
    '@type': 'ImageObject',
    url: abs(`${im.base}-${w}.${im.fallback.ext}`),
    width: w,
    height: Math.round((w / im.width) * im.height),
    caption,
  };
}

export function website(): object {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: `${site.url}/`,
    name: site.name,
    description: 'Assessoria de investimentos para alta renda com Rafaela Alves, na EQI Investimentos.',
    inLanguage: site.locale,
    publisher: { '@id': ID.person },
  };
}

export function person(): object {
  return {
    '@type': 'Person',
    '@id': ID.person,
    name: site.person.name,
    url: `${site.url}/`,
    jobTitle: site.person.jobTitle,
    description:
      'Assessora de investimentos na EQI Investimentos, com passagens por Santander Select e XP Investimentos, certificações Ancord, CEA e CPA-20 e mais de R$ 500 milhões gerenciados ao longo da carreira.',
    image: imageObject(PORTRAIT, 'Rafaela Alves, assessora de investimentos na EQI Investimentos'),
    telephone: site.whatsapp.tel,
    knowsLanguage: 'pt-BR',
    worksFor: { '@type': 'Organization', '@id': ID.employer, name: site.person.employer.name, url: site.person.employer.url },
    hasCredential: site.person.credentials.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name,
      credentialCategory: 'Certificação profissional',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
    })),
    knowsAbout: [
      'Assessoria de investimentos',
      'Investimentos para alta renda',
      'Gestão patrimonial',
      'Fundos de investimento',
      'Fundos de Investimento Imobiliário (FII)',
      'Renda fixa',
      'Investimentos no exterior',
      'Produtos para investidor qualificado',
    ],
    ...(site.person.sameAs.length ? { sameAs: site.person.sameAs } : {}),
  };
}

export function service(): object {
  return {
    '@type': 'Service',
    '@id': ID.service,
    name: 'Assessoria de investimentos para alta renda',
    serviceType: 'Assessoria de investimentos',
    description:
      'Assessoria de investimentos personalizada para pessoa física e empresas: estratégias sob medida, acesso a oportunidades exclusivas, relatórios transparentes e aconselhamento contínuo.',
    provider: { '@id': ID.person },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    audience: { '@type': 'Audience', audienceType: 'Investidores de alta renda (pessoa física e empresas)' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Assessoria gratuita para clientes com investimentos a partir de R$ 300.000,00',
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      name: 'WhatsApp',
      serviceUrl: whatsappUrl(),
      servicePhone: { '@type': 'ContactPoint', telephone: site.whatsapp.tel, contactType: 'customer service', availableLanguage: 'Portuguese' },
    },
  };
}

export function faqPage(pagePath: string): object {
  return {
    '@type': 'FAQPage',
    '@id': `${abs(pagePath)}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function breadcrumb(pagePath: string, items: Array<{ name: string; path: string }>): object {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(pagePath)}#breadcrumb`,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path) })),
  };
}

export interface WebPageOptions {
  path: string;
  title: string;
  description: string;
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ProfilePage';
  modified?: string;
  about?: boolean;
  hasBreadcrumb?: boolean;
}

export function webPage(o: WebPageOptions): object {
  const url = abs(o.path);
  return {
    '@type': o.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: o.title,
    description: o.description,
    inLanguage: site.locale,
    isPartOf: { '@id': ID.website },
    ...(o.about ? { about: { '@id': ID.person }, mainEntity: { '@id': ID.service } } : {}),
    ...(o.modified ? { dateModified: o.modified } : {}),
    ...(o.hasBreadcrumb ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
  };
}

export function blogPosting(post: Post, cats: Map<string, Category>): object {
  const url = abs(`/${post.slug}/`);
  const cover = image(post.image);
  const coverWidth = cover?.fallback.widths[cover.fallback.widths.length - 1];
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.modified,
    inLanguage: site.locale,
    wordCount: post.words,
    articleSection: post.categories.map((c) => cats.get(c)?.name).filter(Boolean),
    mainEntityOfPage: { '@id': `${url}#webpage` },
    isPartOf: { '@id': ID.website },
    author: { '@id': ID.person, '@type': 'Person', name: site.person.name, url: `${site.url}/#sobre` },
    publisher: { '@id': ID.person },
    ...(cover && coverWidth
      ? {
          image: {
            '@type': 'ImageObject',
            url: abs(`${cover.base}-${coverWidth}.${cover.fallback.ext}`),
            width: coverWidth,
            height: Math.round((coverWidth / cover.width) * cover.height),
          },
        }
      : {}),
  };
}

export function itemList(pagePath: string, posts: Post[]): object {
  return {
    '@type': 'ItemList',
    '@id': `${abs(pagePath)}#lista`,
    itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/${p.slug}/`), name: p.title })),
  };
}
