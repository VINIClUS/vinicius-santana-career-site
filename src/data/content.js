const email = 'me@vinisantana.com';
const mailSubject = encodeURIComponent('Interview conversation - Data Engineering / Software Engineering');
const mailBody = encodeURIComponent('Hi Vinicius, I found your career site and would like to schedule a conversation.');

export const profile = {
  name: 'Vinicius Santana',
  title: 'Software & Data Engineer',
  location: 'Brazil, UTC-3',
  email,
  mailto: `mailto:${email}?subject=${mailSubject}&body=${mailBody}`,
  linkedin: 'https://linkedin.com/in/vinsantana',
  github: 'https://github.com/VINIClUS',
  domain: 'https://vinisantana.com',
  resume: '/assets/vinicius-santana-resume.pdf',
  availability: 'Available for remote roles and technical interviews'
};

export const navLinks = [
  { href: '/explore/', label: 'Work' },
  { href: '/about/', label: 'About' },
  { href: '/resume/', label: 'Resume' },
  { href: '/#contact', label: 'Contact' }
];

export const roleFit = [
  {
    title: 'Data Engineering',
    text: 'Pipelines, reconciliation, PostgreSQL models, data-quality checks and operational reporting.'
  },
  {
    title: 'Software Engineering',
    text: 'Backend APIs, automation tooling, testable workflows and maintainable service boundaries.'
  },
  {
    title: 'Platform / DevOps',
    text: 'Linux-first operations, containers, delivery automation, monitoring, runbooks and recovery practices.'
  }
];

export const experience = {
  role: 'Health Informatics Analyst & Data Engineer',
  organization: 'Prefeitura de Presidente Epitácio',
  period: 'Oct 2023 — Present',
  summary:
    'Data and software work for public-health operations, with emphasis on reliability, reporting integrity, automation and maintainable workflows.',
  highlights: [
    'Build validation and reconciliation workflows for SUS-related public-health data.',
    'Automate recurring reporting routines that otherwise depend on manual spreadsheet checks.',
    'Work across PostgreSQL, Python, SQL, APIs, data-quality rules, Linux environments and operational monitoring.',
    'Make failures visible earlier across billing, reporting and health-data handoffs.',
    'Document operational routines so systems can be maintained without relying on memory or one-off scripts.'
  ]
};

export const stackGroups = [
  { title: 'Backend', items: ['Python', 'FastAPI', 'Go', 'REST APIs', 'Background jobs'] },
  { title: 'Data', items: ['SQL', 'PostgreSQL', 'ETL', 'Data Quality', 'Parquet', 'Firebird', 'Reconciliation'] },
  { title: 'DevOps / Infra', items: ['Docker', 'Linux', 'GitHub Actions', 'Ansible', 'Packer', 'Bash'] },
  { title: 'Observability', items: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Loki', 'Runbooks'] },
  { title: 'Frontend', items: ['TypeScript', 'JavaScript', 'React', 'Accessible UI'] }
];
