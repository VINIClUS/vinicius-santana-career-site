export const siteMetadata = {
  title: 'Vinicius Santana — Data Engineer & Software Engineer',
  description:
    'Vinicius Santana is a Data Engineer and Software Engineer focused on Python, SQL, PostgreSQL, FastAPI, Go, data platforms, backend APIs, automation and public-health information systems.',
  openGraphDescription:
    'Reliable data pipelines, backend APIs and automation for public-health and operational systems.',
  twitterDescription:
    'Python, SQL, PostgreSQL, FastAPI, Go, data platforms, APIs, automation and public-health systems.',
  imagePath: '/assets/images/og-image.jpg',
  imageAlt: 'Professional profile card for Vinicius Santana, Data Engineer and Software Engineer'
} as const;

export const createPersonStructuredData = (site: URL) =>
  ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Vinicius Santana',
    url: site.origin,
    image: new URL(siteMetadata.imagePath, site).href,
    jobTitle: 'Data Engineer & Software Engineer',
    email: 'mailto:me@vinisantana.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR'
    },
    sameAs: [
      'https://linkedin.com/in/vinsantana',
      'https://github.com/VINIClUS',
      'https://vinisantana.com'
    ],
    knowsAbout: [
      'Python',
      'SQL',
      'PostgreSQL',
      'FastAPI',
      'Go',
      'Data Engineering',
      'ETL',
      'Data Quality',
      'REST APIs',
      'Public-health information systems',
      'Linux',
      'Docker',
      'Kubernetes',
      'DevOps',
      'Observability'
    ]
  }) as const;
