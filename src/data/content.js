const email = 'me@vinisantana.com';
const mailSubject = encodeURIComponent('Interview conversation - Data Engineering / Software Engineering');
const mailBody = encodeURIComponent('Hi Vinicius, I found your career site and would like to schedule a conversation.');

export const profile = {
  name: 'Vinicius Santana',
  title: 'Data Engineer & Software Engineer',
  location: 'Brazil, UTC-3',
  email,
  mailto: `mailto:${email}?subject=${mailSubject}&body=${mailBody}`,
  linkedin: 'https://linkedin.com/in/vinsantana',
  github: 'https://github.com/VINIClUS',
  domain: 'https://vinisantana.com',
  resume: '/assets/vinicius-santana-resume.pdf',
  availability: 'Available for remote roles and technical interviews'
  // Optional WhatsApp contact can be added later. Do not publish a placeholder number.
};

export const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#stack', label: 'Stack' },
  { href: '#contact', label: 'Contact' }
];

export const heroChips = [
  'Python',
  'SQL',
  'PostgreSQL',
  'FastAPI',
  'Go',
  'Docker',
  'Data Quality',
  'Observability',
  'Public Health Systems'
];

export const roleFit = [
  {
    title: 'Data Engineering',
    text: 'Pipelines, reconciliation, validation rules, PostgreSQL models, data-quality checks and operational reporting.'
  },
  {
    title: 'Software Engineering',
    text: 'Backend APIs, automation tooling, testable workflows, integrations and maintainable service boundaries.'
  },
  {
    title: 'Platform / DevOps',
    text: 'Linux-first operations, Docker, GitHub Actions, monitoring, runbooks, backups and repeatable deployment routines.'
  }
];

export const impactMetrics = [
  {
    value: '240+ hrs → ~4 hrs',
    label: 'Manual reconciliation reduced',
    text: 'Automated a fragile data-reconciliation workflow so recurring validation could be repeated, audited and reviewed faster.'
  },
  {
    value: '21k records / month',
    label: 'Operational checks',
    text: 'Built validation routines around monthly health-data records, reporting consistency and issue detection.'
  },
  {
    value: '12%+ → <1%',
    label: 'Denial rate improvement',
    text: 'Helped reduce billing denial rates through earlier data validation, reconciliation and process correction.'
  },
  {
    value: '11 audit rules',
    label: 'CNES validation engine',
    text: 'Implemented as auditable rules over local and national data sources with explicit source provenance.'
  }
];

export const experience = {
  role: 'Health Informatics Analyst & Data Engineer',
  organization: 'Prefeitura de Presidente Epitácio',
  period: 'Oct 2023 — Present',
  summary:
    'Data and software work for public-health operations, with emphasis on reliability, billing/reporting integrity, automation and maintainable workflows.',
  highlights: [
    'Built validation and reconciliation workflows for SUS-related public-health data.',
    'Automated recurring reporting routines that previously depended on manual spreadsheet checks.',
    'Worked across PostgreSQL, Python, SQL, APIs, data-quality rules, Linux environments and operational monitoring.',
    'Improved reliability around billing, reporting and health-data handoffs by making failures visible earlier.',
    'Documented operational routines so systems could be maintained without relying on memory or one-off scripts.'
  ]
};

export const projects = [
  {
    id: 'cnesdata',
    title: 'CnesData',
    eyebrow: 'Data reconciliation platform',
    description:
      'Multi-tenant reconciliation engine for Brazilian CNES datasets. Local dump agents extract Firebird records, serialize Parquet and send data to a central API that validates local and national sources before PostgreSQL persistence.',
    proof: ['11 audit rules', 'Firebird + BigQuery', 'Parquet ingestion', 'PostgreSQL audit trail', '319+ unit tests'],
    stack: ['Python', 'FastAPI', 'PostgreSQL', 'SQL', 'Docker', 'Parquet', 'BigQuery', 'Firebird'],
    links: [
      { label: 'View repository', href: 'https://github.com/VINIClUS/CnesData', external: true },
      { label: 'Read case study', href: '#case-cnesdata' },
      { label: 'Technical notes', href: 'https://github.com/VINIClUS/CnesData#readme', external: true }
    ]
  },
  {
    id: 'esus-pec-bootstrap',
    title: 'e-SUS PEC Bootstrap',
    eyebrow: 'Public-health operations automation',
    description:
      'Automation, runbooks and validators for e-SUS PEC environments: provisioning, TLS, Gov.br OAuth, CNES/PBF imports, backups, restore workflows and monitoring.',
    proof: ['LXC/VM provisioning', 'TLS + OAuth setup', 'MinIO / WAL-G backups', 'Prometheus + Grafana monitoring'],
    stack: ['Python', 'Bash', 'PowerShell', 'Go', 'Docker', 'Linux', 'MinIO', 'Prometheus', 'Grafana'],
    links: [
      { label: 'View repository', href: 'https://github.com/VINIClUS/esus-pec-bootstrap', external: true },
      { label: 'Read case study', href: '#case-esus-pec-bootstrap' },
      { label: 'Technical notes', href: 'https://github.com/VINIClUS/esus-pec-bootstrap#readme', external: true }
    ]
  },
  {
    id: 'aquafarm',
    title: 'AquaFarm API',
    eyebrow: 'Operational sensor ingestion',
    description:
      'Sensor-data ingestion API designed around asynchronous writes. The service receives water-quality readings, queues background processing and persists operational metrics in PostgreSQL.',
    proof: ['POST ingestion endpoint', 'Background jobs', 'PostgreSQL persistence', 'RSpec test suite'],
    stack: ['Ruby on Rails 7', 'PostgreSQL', 'Active Job', 'RSpec', 'REST API'],
    links: [
      { label: 'View repository', href: 'https://github.com/VINIClUS/aquafarm', external: true },
      { label: 'Read case study', href: '#case-aquafarm' },
      { label: 'Technical notes', href: 'https://github.com/VINIClUS/aquafarm#readme', external: true }
    ]
  }
];

export const caseNotes = [
  {
    id: 'case-cnesdata',
    title: 'CnesData: making municipal health-data reconciliation auditable',
    context:
      'Municipal health teams need to compare local operational records with national CNES data without losing source provenance or relying on manual spreadsheet inspection.',
    approach: [
      'Separated ingestion into local and national stages so Firebird, Parquet and BigQuery inputs are explicit.',
      'Preserved source provenance instead of silently merging local and national records.',
      'Persisted outputs in PostgreSQL for historical comparison, reporting and repeatable audits.',
      'Kept validation rules testable and documented so new municipalities can reuse the engine.'
    ],
    outcome: 'A clearer path from raw operational extracts to auditable reconciliation results, with fewer manual handoffs and stronger failure visibility.'
  },
  {
    id: 'case-esus-pec-bootstrap',
    title: 'e-SUS PEC Bootstrap: operational reliability through automation',
    context:
      'Public-health systems require repeatable setup, safe upgrades, backups, monitoring and documented recovery paths.',
    approach: [
      'Organized provisioning, first-run automation, TLS, OAuth and import routines in one repository.',
      'Documented backup/restore workflows using object storage patterns and validation scripts.',
      'Connected monitoring concerns to the operational codebase instead of treating them as a separate afterthought.',
      'Kept secrets out of tracked files and made environment configuration explicit.'
    ],
    outcome: 'A more maintainable operations baseline for e-SUS PEC environments, with runbooks and validators close to the scripts they support.'
  },
  {
    id: 'case-aquafarm',
    title: 'AquaFarm API: asynchronous ingestion for sensor data',
    context:
      'Operational sensor readings should be accepted quickly without coupling ingestion latency to downstream processing.',
    approach: [
      'Exposed a focused REST endpoint for sensor readings with clear payload structure.',
      'Used background jobs so API requests can acknowledge ingestion while persistence work continues asynchronously.',
      'Modeled water-quality metrics such as temperature, pH, dissolved oxygen, turbidity and salinity.',
      'Added automated tests to protect the ingestion contract.'
    ],
    outcome: 'A small but concrete service boundary for operational data capture, suitable for extending into dashboards, alerts and quality-control workflows.'
  }
];

export const stackGroups = [
  { title: 'Backend', items: ['Python', 'FastAPI', 'Go', 'Node.js', 'REST APIs', 'Background jobs'] },
  { title: 'Data', items: ['SQL', 'PostgreSQL', 'ETL', 'Data Quality', 'Parquet', 'BigQuery', 'Firebird', 'Reconciliation'] },
  {
    title: 'DevOps / Infra',
    items: ['Docker', 'Kubernetes', 'Linux', 'GitHub Actions', 'Nginx', 'HAProxy', 'Traefik', 'Jenkins', 'Bash']
  },
  { title: 'Observability', items: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Loki', 'Runbooks'] },
  { title: 'Frontend', items: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Accessible UI'] }
];
