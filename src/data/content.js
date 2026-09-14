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
  { href: profile.linkedin, label: 'LinkedIn', external: true },
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
  }
];

export const experience = {
  summary:
    'Software Engineer experienced in building Python/FastAPI services, maintaining Java/Spring systems, debugging production failures, measuring performance, and operating reliable PostgreSQL-backed platforms. Built validation, integration, and automation workflows for municipal healthcare, processing 21,000+ monthly records, reducing a 240+ person-hour reconciliation cycle to about 4 hours, and sustaining claim rejection rates below 1% for 8 consecutive cycles.',
  organization: 'Prefeitura de Presidente Epitácio',
  period: 'Nov 2021 — Present',
  roles: [
    {
      title: 'Software Engineering & Health Data Systems',
      period: 'Oct 2023 — Present',
      highlights: [
        'Built Python/FastAPI validation services and maintained Java/Spring/PostgreSQL systems, modeling longitudinal patient identity across historical names, missing or changed CPF identifiers, and CNS changes for 21,000+ monthly records.',
        'Diagnosed Java/Spring performance degradation caused by an unset optional identifier that prolonged object lifetime and increased garbage-collection pressure; fixed identifier assignment and cleanup behavior to restore stable execution.',
        'Built performance instrumentation to detect N+1 patterns, repeated execution paths, and latency regressions, validating changes through baseline/diff comparisons, shadow runs, and night/chaos tests.',
        'Debugged an edge agent across installation, discovery, and execution using isolated VMs, MITM traffic inspection, and runtime diagnostics; traced repeat-install failures to stale Windows Registry and machine state, then updated uninstall cleanup and forced discovery during installation.',
        'Reduced healthcare claim rejection rates from 12%+ to below 1% across 8 consecutive billing cycles by engineering 11 auditable Python/SQL validation and reconciliation rules across legacy and government systems.',
        'Cut municipality-wide workforce reconciliation from 240+ person-hours to about 4 per cycle by building Python extraction, Parquet processing, provenance controls, and centralized APIs.',
        'Built an S3/Parquet analytical path cataloged by AWS Glue and queried through Athena, and worked on SQS, Lambda, and SES workflows for cross-application audit events and transactional email.',
        'Authored installation, operations, troubleshooting, and handoff guides, and trained 5 staff members plus 3+ physicians and nurses on production workflows, auditing, and issue resolution.'
      ]
    },
    {
      title: 'IT Infrastructure & Systems Support · Internship',
      period: 'Nov 2021 — Oct 2023',
      highlights: [
        'Designed and shipped a domain-specific plugin that reduced a mandatory dengue-reporting workflow from 7 manual steps to one checkbox.',
        'Operated health-check-driven failover for Nginx and application replicas across distributed municipal nodes, shifting traffic from unhealthy nodes within approximately 1–3 minutes with no reported user-visible outages.',
        'Improved release and recovery reliability with Ansible/Jenkins automation, health checks, backup checkpoints, certificate and credential rotation, and rollback procedures; restored a 9 GB PostgreSQL-backed application within 1 hour after a failed update.'
      ]
    }
  ]
};

export const familyBusinessExperience = {
  organization: 'Irmãos Santana',
  period: 'Feb 2021 — Jan 2026 · Part-time',
  roles: [
    {
      title: 'Business Analyst & Operations Manager',
      period: 'Feb 2021 — Jan 2026 · Part-time',
      highlights: [
        'Increased profitability by 26% and reduced feed waste by 11% for a 20-ton/month aquaculture operation by redesigning pricing, purchasing, inventory, cost-control, and production workflows.',
        'Built Python decision-support tools, spreadsheet and ERP automations, and MQTT telemetry prototypes to measure production KPIs, inventory, water quality, and operating costs.'
      ]
    }
  ]
};

export const stackGroups = [
  { title: 'Backend', items: ['Python', 'Java', 'FastAPI', 'Spring', 'Pydantic', 'SQLAlchemy', 'REST/OpenAPI'] },
  { title: 'Data', items: ['SQL', 'PostgreSQL', 'Redis', 'DynamoDB', 'InfluxDB', 'Parquet', 'MinIO/S3'] },
  { title: 'Testing & Quality', items: ['Pytest', 'Hypothesis', 'Testcontainers', 'Ruff', 'Pyright'] },
  { title: 'Platform & Reliability', items: ['AWS', 'Docker', 'Linux', 'Ansible', 'Prometheus', 'Grafana'] },
  { title: 'Frontend', items: ['TypeScript', 'React'] }
];
