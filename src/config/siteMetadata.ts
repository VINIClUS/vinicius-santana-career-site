export const siteMetadata = {
  title: 'Vinicius Santana — Software Engineer, Backend & Full Stack',
  description:
    'Vinicius Santana is a backend and full-stack Software Engineer building Python/FastAPI and Java/Spring services, PostgreSQL data workflows and React interfaces for public-health information systems.',
  openGraphDescription:
    'Python/FastAPI and Java/Spring services for public-health systems: claim rejections cut from 12%+ to below 1%.',
  twitterDescription:
    'Python, Java, TypeScript, FastAPI, Spring Boot, PostgreSQL, React and AWS for public-health systems.',
  imagePath: '/assets/images/og-image.jpg',
  imageAlt: 'Professional profile card for Vinicius Santana'
} as const;

export const createPersonStructuredData = (site: URL) =>
  ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Vinicius Santana',
    url: site.origin,
    image: new URL(siteMetadata.imagePath, site).href,
    jobTitle: 'Software Engineer — Backend & Full Stack',
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
      'Java',
      'TypeScript',
      'FastAPI',
      'Spring Boot',
      'PostgreSQL',
      'React',
      'AWS',
      'REST APIs',
      'Data Quality',
      'Public-health information systems',
      'Docker',
      'Kubernetes'
    ]
  }) as const;
